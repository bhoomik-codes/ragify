import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function clampRangeDays(value: number): number {
  if (!Number.isFinite(value)) return 7;
  if (value <= 7) return 7;
  if (value <= 30) return 30;
  return 30;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const rangeDays = clampRangeDays(Number(url.searchParams.get("rangeDays") ?? "7"));
    const ragId = url.searchParams.get("ragId") ?? undefined;

    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);

    const messages = await db.message.findMany({
      where: {
        createdAt: { gte: since },
        conversation: {
          userId: session.user.id,
          ...(ragId ? { ragId } : {}),
        },
      },
      select: {
        role: true,
        tokenUsage: true,
        responseTimeMs: true,
        createdAt: true,
        conversation: { select: { ragId: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const dayBuckets = new Map<
      string,
      { date: string; assistantMessages: number; totalTokens: number; totalResponseMs: number }
    >();

    let assistantMessages = 0;
    let userMessages = 0;
    const assistantTokens: number[] = [];
    const assistantResponseMs: number[] = [];

    for (const m of messages) {
      const dateKey = m.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const bucket =
        dayBuckets.get(dateKey) ??
        { date: dateKey, assistantMessages: 0, totalTokens: 0, totalResponseMs: 0 };

      if (m.role === "ASSISTANT") {
        assistantMessages++;
        bucket.assistantMessages++;
        bucket.totalTokens += m.tokenUsage ?? 0;
        bucket.totalResponseMs += m.responseTimeMs ?? 0;
        assistantTokens.push(m.tokenUsage ?? 0);
        assistantResponseMs.push(m.responseTimeMs ?? 0);
      } else {
        userMessages++;
      }

      dayBuckets.set(dateKey, bucket);
    }

    assistantTokens.sort((a, b) => a - b);
    assistantResponseMs.sort((a, b) => a - b);

    const series = Array.from(dayBuckets.values()).map((b) => ({
      date: b.date,
      assistantMessages: b.assistantMessages,
      avgTokens: b.assistantMessages ? Math.round(b.totalTokens / b.assistantMessages) : 0,
      avgResponseMs: b.assistantMessages ? Math.round(b.totalResponseMs / b.assistantMessages) : 0,
    }));

    const totals = {
      assistantMessages,
      userMessages,
      avgTokens: assistantMessages
        ? Math.round(assistantTokens.reduce((a, x) => a + x, 0) / assistantMessages)
        : 0,
      avgResponseMs: assistantMessages
        ? Math.round(assistantResponseMs.reduce((a, x) => a + x, 0) / assistantMessages)
        : 0,
      p50ResponseMs: Math.round(percentile(assistantResponseMs, 0.5)),
      p95ResponseMs: Math.round(percentile(assistantResponseMs, 0.95)),
    };

    return NextResponse.json({
      rangeDays,
      ragId: ragId ?? null,
      totals,
      series,
    });
  } catch (error) {
    console.error("[ANALYTICS_OVERVIEW_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


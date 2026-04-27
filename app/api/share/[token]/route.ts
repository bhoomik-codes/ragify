import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_ATTEMPTS_PER_MINUTE = 20;
const WINDOW_MS = 60_000;
const attempts = new Map<string, number[]>();

function getClientKey(request: Request, token: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return `${token}:${ip}`;
}

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const existing = attempts.get(key) ?? [];
  const recent = existing.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS_PER_MINUTE) {
    attempts.set(key, recent);
    return false;
  }
  recent.push(now);
  attempts.set(key, recent);
  return true;
}

export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
    const key = getClientKey(request, params.token);
    if (!checkRateLimit(key)) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }

    const link = await db.shareLink.findUnique({
      where: { token: params.token },
      include: { rag: true },
    });

    if (!link) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (link.passwordHash) {
      return NextResponse.json({ error: "Password required" }, { status: 401 });
    }

    await db.shareLink.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    });

    return NextResponse.json({
      rag: {
        id: link.rag.id,
        name: link.rag.name,
        description: link.rag.description,
        emoji: link.rag.emoji,
      },
    });
  } catch (e) {
    console.error("[SHARE_RESOLVE_ERROR]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { token: string } }) {
  try {
    const key = getClientKey(request, params.token);
    if (!checkRateLimit(key)) {
      return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";
    if (!password) return NextResponse.json({ error: "Password required" }, { status: 400 });

    const link = await db.shareLink.findUnique({
      where: { token: params.token },
      include: { rag: true },
    });

    if (!link) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    if (!link.passwordHash) {
      await db.shareLink.update({
        where: { id: link.id },
        data: { clickCount: { increment: 1 } },
      });
      return NextResponse.json({
        rag: {
          id: link.rag.id,
          name: link.rag.name,
          description: link.rag.description,
          emoji: link.rag.emoji,
        },
      });
    }

    const ok = await bcrypt.compare(password, link.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.shareLink.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    });

    return NextResponse.json({
      rag: {
        id: link.rag.id,
        name: link.rag.name,
        description: link.rag.description,
        emoji: link.rag.emoji,
      },
    });
  } catch (e) {
    console.error("[SHARE_VERIFY_ERROR]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


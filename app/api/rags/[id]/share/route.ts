import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createShareLinkSchema } from "@/lib/validators";
import { generateShareToken } from "@/lib/crypto";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function toShareLinkDto(link: {
  id: string;
  ragId: string;
  token: string;
  expiresAt: Date | null;
  clickCount: number;
  createdAt: Date;
  passwordHash: string | null;
}) {
  return {
    id: link.id,
    ragId: link.ragId,
    token: link.token,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    clickCount: link.clickCount,
    createdAt: link.createdAt.toISOString(),
    hasPassword: Boolean(link.passwordHash),
  };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rag = await db.rag.findUnique({ where: { id: params.id } });
    if (!rag) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (rag.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const links = await db.shareLink.findMany({
      where: { ragId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(links.map(toShareLinkDto));
  } catch (e) {
    console.error("[GET_SHARE_LINKS_ERROR]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rag = await db.rag.findUnique({ where: { id: params.id } });
    if (!rag) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (rag.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const json = await request.json().catch(() => ({}));
    const parsed = createShareLinkSchema.safeParse({
      ...json,
      ragId: params.id,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const token = generateShareToken();
    const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : null;
    const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;

    const created = await db.shareLink.create({
      data: {
        ragId: params.id,
        token,
        passwordHash,
        expiresAt,
      },
    });

    return NextResponse.json(toShareLinkDto(created), { status: 201 });
  } catch (e) {
    console.error("[CREATE_SHARE_LINK_ERROR]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


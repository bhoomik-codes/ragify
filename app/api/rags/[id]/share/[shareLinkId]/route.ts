import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; shareLinkId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rag = await db.rag.findUnique({ where: { id: params.id } });
    if (!rag) return NextResponse.json({ error: "Not Found" }, { status: 404 });
    if (rag.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const link = await db.shareLink.findUnique({ where: { id: params.shareLinkId } });
    if (!link || link.ragId !== params.id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    await db.shareLink.delete({ where: { id: params.shareLinkId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE_SHARE_LINK_ERROR]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


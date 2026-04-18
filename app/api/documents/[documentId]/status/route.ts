import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = params;

    const document = await db.document.findUnique({
      where: { id: documentId },
      include: { rag: true }
    });

    if (!document) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (document.rag.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Direct interface projection securely fulfilling frontend contract implicitly!
    return NextResponse.json({
       documentId: document.id,
       status: document.status,
       chunkCount: document.chunkCount
    }, { status: 200 });

  } catch (error) {
    console.error("[STATUS_POLL_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

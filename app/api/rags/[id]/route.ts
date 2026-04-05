import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapRagToDto } from "@/lib/mappers";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rag = await db.rag.findUnique({
      where: { id: params.id },
    });

    if (!rag) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // IDOR Security check strictly bounds the lookup explicitly to the tenant
    if (rag.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(mapRagToDto(rag));
  } catch (error) {
    console.error("[GET_RAG_BY_ID_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

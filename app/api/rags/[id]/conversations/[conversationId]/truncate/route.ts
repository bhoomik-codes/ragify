import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { id: string, conversationId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { keepCount } = body;

    const messages = await db.message.findMany({
      where: { conversationId: params.conversationId },
      orderBy: { createdAt: 'asc' }
    });

    if (messages.length > keepCount) {
      const toDelete = messages.slice(keepCount).map(m => m.id);
      await db.message.deleteMany({
        where: { id: { in: toDelete } }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

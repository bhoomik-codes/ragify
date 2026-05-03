import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string, conversationId: string, messageId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const message = await db.message.findUnique({
      where: { id: params.messageId }
    });

    if (!message) return NextResponse.json({ success: true });

    // Ensure it belongs to the user via conversation
    const conversation = await db.conversation.findUnique({
      where: { id: params.conversationId, userId: session.user.id }
    });

    if (!conversation) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Delete just this single message
    await db.message.delete({
      where: { id: params.messageId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

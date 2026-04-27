import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await db.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[PROFILE_AVATAR_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.type.split('/')[1];
    const filename = `${session.user.id}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'avatars');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const avatarUrl = `/avatars/${filename}`;

    await db.user.update({
      where: { id: session.user.id },
      data: { avatarUrl, image: avatarUrl }
    });

    return NextResponse.json({ avatarUrl }, { status: 200 });
  } catch (error) {
    console.error('[PROFILE_AVATAR_UPLOAD_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username, displayName, bio } = body;

    const dataToUpdate: any = {};

    if (username !== undefined) {
      if (!/^[a-z0-9-]{3,30}$/i.test(username)) {
        return NextResponse.json({ error: 'Invalid username format' }, { status: 400 });
      }
      
      const existing = await db.user.findFirst({
        where: { name: username, NOT: { id: session.user.id } }
      });
      if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }
      dataToUpdate.name = username;
    }

    if (displayName !== undefined) {
      if (displayName.length > 50) {
        return NextResponse.json({ error: 'Display name too long' }, { status: 400 });
      }
      dataToUpdate.displayName = displayName;
    }

    if (bio !== undefined) {
      if (bio.length > 160) {
        return NextResponse.json({ error: 'Bio too long' }, { status: 400 });
      }
      dataToUpdate.bio = bio;
    }

    const { theme } = body;
    if (theme !== undefined) {
      if (!['light', 'dark'].includes(theme)) {
        return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
      }
      dataToUpdate.theme = theme;
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await db.user.update({
        where: { id: session.user.id },
        data: dataToUpdate
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[PROFILE_PATCH_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

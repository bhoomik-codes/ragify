import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { runIngestionPipeline } from '@/lib/pipeline';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getStorage } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // IDOR check
    const rag = await db.rag.findUnique({ where: { id: params.id } });
    if (!rag) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    if (rag.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Validate file type
    const allowedTypes = [
      'text/plain', 
      'text/markdown', 
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|csv|pdf|docx)$/i)) {
      return NextResponse.json({ error: 'Unsupported file type. Use TXT, MD, CSV, PDF, or DOCX.' }, { status: 415 });
    }

    // Max 10MB guard
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const clientName = typeof file.name === "string" ? file.name : "upload";
    const sanitizedBaseName = path.basename(clientName);
    const storage = getStorage();
    const storageKey = `documents/${params.id}/${randomUUID()}_${sanitizedBaseName}`;
    await storage.putObject({ key: storageKey, body: buffer, contentType: file.type });

    // Create DB document record
    const document = await db.document.create({
      data: {
        ragId: params.id,
        name: file.name,
        size: file.size,
        type: file.type || 'text/plain',
        status: 'QUEUED',
        storageProvider: storage.provider,
        storageKey,
        metadata: { mimeType: file.type || 'text/plain' } as any,
      },
    });

    await runIngestionPipeline(document.id);
    const updated = await db.document.findUnique({ where: { id: document.id } });

    return NextResponse.json({
      id: document.id,
      name: document.name,
      status: updated?.status ?? 'QUEUED',
      message: 'Document upload completed.',
    }, { status: 200 });

  } catch (error) {
    console.error('[CHAT_DOCUMENT_UPLOAD_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

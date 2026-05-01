import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { runIngestionPipeline } from '@/lib/pipeline';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getStorage } from '@/lib/storage';
import { UPLOAD_CONFIG } from '@/lib/uploadConfig';

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
    const allowedMimeTypes = new Set(Object.keys(UPLOAD_CONFIG.MIME_TYPES));
    const allowedExtensions = new Set(UPLOAD_CONFIG.getAllowedExtensions().map(e => e.replace('.', '')));
    
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (!allowedMimeTypes.has(file.type) && !allowedExtensions.has(ext)) {
      return NextResponse.json({ error: `Unsupported file type. Allowed: ${UPLOAD_CONFIG.getAcceptString()}` }, { status: 415 });
    }

    // Max limit guard
    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Maximum size is ${UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB.` }, { status: 413 });
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

    // Fire and forget background ingestion
    runIngestionPipeline(document.id).catch(err => {
      console.error(`[BACKGROUND_INGESTION_ERROR] Document ${document.id}:`, err);
    });

    return NextResponse.json({
      id: document.id,
      name: document.name,
      status: 'QUEUED',
      message: 'Document ingestion started in background.',
    }, { status: 202 });

  } catch (error) {
    console.error('[CHAT_DOCUMENT_UPLOAD_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

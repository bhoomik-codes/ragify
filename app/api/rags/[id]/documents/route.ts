import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { runIngestionPipeline } from '@/lib/pipeline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

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
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' // pptx
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|md|csv|pdf|docx|pptx)$/i)) {
      return NextResponse.json({ error: 'Unsupported file type. Use TXT, MD, CSV, PDF, DOCX, or PPTX.' }, { status: 415 });
    }

    // Max 10MB guard
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 413 });
    }

    // Write to temp file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const tmpPath = path.join(os.tmpdir(), `rag_upload_${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`);
    fs.writeFileSync(tmpPath, buffer);

    // Create DB document record
    const document = await db.document.create({
      data: {
        ragId: params.id,
        name: file.name,
        size: file.size,
        type: file.type || 'text/plain',
        status: 'QUEUED',
      },
    });

    // Fire-and-forget ingestion (non-blocking)
    runIngestionPipeline(document.id, tmpPath).catch(err =>
      console.error('[CHAT_UPLOAD_PIPELINE_ERROR]', err)
    );

    return NextResponse.json({
      id: document.id,
      name: document.name,
      status: 'QUEUED',
      message: 'Document upload started. It will be available shortly.',
    }, { status: 202 });

  } catch (error) {
    console.error('[CHAT_DOCUMENT_UPLOAD_ERROR]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

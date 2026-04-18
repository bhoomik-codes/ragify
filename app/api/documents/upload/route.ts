import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { runIngestionPipeline } from "@/lib/pipeline";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const UPLOAD_DIR = "/tmp/ragify-uploads/";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const ragId = formData.get("ragId") as string;
    const file = formData.get("file") as File | null;

    if (!ragId || !file) {
      return NextResponse.json({ error: "Missing ragId or file in payload" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    // Auth ownership block mapped safely avoiding explicit IDOR loops natively
    const rag = await db.rag.findUnique({
      where: { id: ragId }
    });

    if (!rag) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (rag.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare Local Node `/tmp/` staging mimicking Object stores sequentially
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    const safeFileName = `${randomUUID()}_${file.name}`;
    const filePath = path.join(UPLOAD_DIR, safeFileName);
    
    // Explicit Node extraction allocating blobs successfully mapping RAM limits cleanly
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    // Initial persistence natively setting structures immediately resolving UI constraints
    const document = await db.document.create({
      data: {
        ragId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "QUEUED",
        metadata: { mimeType: file.type }
      }
    });

    // Detached background pipeline extraction ensuring quick 201 hook resolves flawlessly
    runIngestionPipeline(document.id, filePath).catch(err =>
      console.error("[PIPELINE_ERROR]", err)
    );

    return NextResponse.json({ 
       documentId: document.id, 
       name: document.name, 
       size: document.size, 
       status: "QUEUED" 
    }, { status: 201 });

  } catch (error) {
    console.error("[UPLOAD_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

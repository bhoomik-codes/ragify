import { NextResponse, after } from "next/server";
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

    const ingestionTask = async () => {
      try {
        await runIngestionPipeline(document.id, filePath);
      } catch (err) {
        // Note: `runIngestionPipeline` already marks the document as FAILED.
        console.error("[PIPELINE_ERROR]", err);
      } finally {
        // Always clean up temp file, regardless of pipeline success/failure.
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          console.error("[UPLOAD_CLEANUP_ERROR] Failed to remove temp file", filePath, cleanupErr);
        }
      }
    };

    // In serverless environments, a detached Promise may be terminated when the response is sent.
    // Prefer `after()` (waitUntil pattern). If unavailable, run synchronously before responding.
    let scheduled = false;
    if (typeof after === "function") {
      after(ingestionTask);
      scheduled = true;
    }

    if (scheduled) {
      return NextResponse.json(
        {
          documentId: document.id,
          name: document.name,
          size: document.size,
          status: "QUEUED",
        },
        { status: 201 },
      );
    }

    await ingestionTask();
    const updated = await db.document.findUnique({ where: { id: document.id } });
    return NextResponse.json(
      {
        documentId: document.id,
        name: document.name,
        size: document.size,
        status: updated?.status ?? "QUEUED",
      },
      { status: 200 },
    );

  } catch (error) {
    console.error("[UPLOAD_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

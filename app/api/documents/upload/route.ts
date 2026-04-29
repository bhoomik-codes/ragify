import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { runIngestionPipeline } from "@/lib/pipeline";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import { getStorage } from "@/lib/storage";

export const runtime = "nodejs";

import { UPLOAD_CONFIG } from "@/lib/uploadConfig";
import { RATE_LIMITS } from "@/lib/rateLimitConfig";

const uploadTimestampsByUser = new Map<string, number[]>();

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Basic per-user in-memory rate limiting (best-effort; resets on cold start).
    const now = Date.now();
    const existing = uploadTimestampsByUser.get(session.user.id) ?? [];
    const recent = existing.filter((ts) => now - ts < RATE_LIMITS.RATE_WINDOW_MS);
    if (recent.length >= RATE_LIMITS.UPLOADS_PER_MINUTE) {
      uploadTimestampsByUser.set(session.user.id, recent);
      return NextResponse.json(
        { error: "Too many uploads. Please wait and try again." },
        { status: 429 },
      );
    }
    recent.push(now);
    uploadTimestampsByUser.set(session.user.id, recent);

    const formData = await request.formData();
    const ragId = formData.get("ragId") as string;
    const file = formData.get("file") as File | null;

    if (!ragId || !file) {
      return NextResponse.json({ error: "Missing ragId or file in payload" }, { status: 400 });
    }

    if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const clientName = typeof file.name === "string" ? file.name : "upload";
    const sanitizedBaseName = path.basename(clientName);
    const ext = sanitizedBaseName.split(".").pop()?.toLowerCase() ?? "";

    const allowedMimeTypes = new Set(Object.keys(UPLOAD_CONFIG.MIME_TYPES));
    const allowedExtensions = new Set(UPLOAD_CONFIG.getAllowedExtensions().map(e => e.replace('.', '')));

    if (!allowedExtensions.has(ext) || !allowedMimeTypes.has(file.type)) {
      return NextResponse.json(
        {
          error: "Unsupported media type",
          allowed: UPLOAD_CONFIG.MIME_TYPES,
          received: { name: clientName, mime: file.type },
        },
        { status: 415 },
      );
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

    // Explicit Node extraction allocating blobs successfully mapping RAM limits cleanly
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storage = getStorage();
    const storageKey = `documents/${ragId}/${randomUUID()}_${sanitizedBaseName}`;
    await storage.putObject({ key: storageKey, body: buffer, contentType: file.type });

    // Initial persistence natively setting structures immediately resolving UI constraints
    const document = await db.document.create({
      data: {
        ragId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "QUEUED",
        storageProvider: storage.provider,
        storageKey,
        metadata: { mimeType: file.type }
      }
    });

    const ingestionTask = async () => {
      try {
        await runIngestionPipeline(document.id);
      } catch (err) {
        // Note: `runIngestionPipeline` already marks the document as FAILED.
        console.error("[PIPELINE_ERROR]", err);
      }
    };

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

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateApiKey } from "@/lib/crypto";
import { createApiKeySchema } from "@/lib/validators";
import type { ApiKeyDto } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/users/me/platform-keys
 * Returns a list of platform API keys for the current user.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await db.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    const dtos: ApiKeyDto[] = keys.map((k) => ({
      id: k.id,
      userId: k.userId,
      name: k.name,
      keyPrefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt?.toISOString() || null,
      createdAt: k.createdAt.toISOString(),
    }));

    return NextResponse.json(dtos);
  } catch (error) {
    console.error("[PLATFORM_KEYS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/users/me/platform-keys
 * Generates a new platform API key for the current user.
 * Returns the raw key ONLY once.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const result = createApiKeySchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name } = result.data;

    // Generate the key: full (raw), hash (bcrypt), prefix (display)
    const { full, hash, prefix } = await generateApiKey();

    const apiKey = await db.apiKey.create({
      data: {
        userId: session.user.id,
        name,
        keyHash: hash,
        keyPrefix: prefix,
      },
    });

    // Return the FULL key so the user can copy it.
    // This is the ONLY time the full key is available.
    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      fullKey: full, // ⚠ Raw key returned here
      prefix: apiKey.keyPrefix,
      createdAt: apiKey.createdAt.toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error("[PLATFORM_KEYS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/users/me/platform-keys
 * Revokes a platform API key.
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing key ID" }, { status: 400 });
    }

    // Verify ownership
    const key = await db.apiKey.findUnique({
      where: { id },
    });

    if (!key || key.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.apiKey.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PLATFORM_KEYS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

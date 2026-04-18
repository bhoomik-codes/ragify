import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptKey } from "@/lib/crypto";
import { createUserApiKeySchema } from "@/lib/validators";
import type { UserApiKeyDto } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/users/me/provider-keys
 * Returns a list of configured LLM providers for the current user.
 * Note: Never returns the raw or encrypted key, only existence metadata.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await db.userApiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { provider: "asc" },
    });

    const dtos: UserApiKeyDto[] = keys.map((k) => ({
      id: k.id,
      userId: k.userId,
      provider: k.provider as any, // Cast to Provider enum
      createdAt: k.createdAt.toISOString(),
    }));

    return NextResponse.json(dtos);
  } catch (error) {
    console.error("[PROVIDER_KEYS_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/users/me/provider-keys
 * Upserts an encrypted provider key for the current user.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const result = createUserApiKeySchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { provider, key } = result.data;

    // Encrypt the key using AES-256-GCM
    const { ciphertext, iv } = encryptKey(key);

    // Upsert: One key per provider per user
    const userApiKey = await db.userApiKey.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: provider as string,
        },
      },
      update: {
        encryptedKey: ciphertext,
        iv: iv,
      },
      create: {
        userId: session.user.id,
        provider: provider as string,
        encryptedKey: ciphertext,
        iv: iv,
      },
    });

    const dto: UserApiKeyDto = {
      id: userApiKey.id,
      userId: userApiKey.userId,
      provider: userApiKey.provider as any,
      createdAt: userApiKey.createdAt.toISOString(),
    };

    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    console.error("[PROVIDER_KEYS_POST_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/users/me/provider-keys
 * Removes a provider key.
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
    const key = await db.userApiKey.findUnique({
      where: { id },
    });

    if (!key || key.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.userApiKey.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PROVIDER_KEYS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

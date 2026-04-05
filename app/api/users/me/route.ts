import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/ratelimit";
import type { UserDto } from "@/lib/types";

// Must use Node.js runtime so `lib/ratelimit.ts` memory remains intact across invocations
// and Prisma sqlite adapter functions correctly.
export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    
    // Ownership check ensures strictly authenticated context
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate Limit Check
    // e.g. Max 10 requests per user per minute for updating their profile
    const { allowed, retryAfter } = await checkRateLimit(
      `user-me-${session.user.id}`,
      10,
      60 * 1000 // 1 minute window
    );
    
    if (!allowed) {
      const response = NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
      if (retryAfter) response.headers.set("Retry-After", String(retryAfter));
      return response;
    }

    // Payload extraction and validation
    const json = await request.json();
    const result = updateProfileSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload format", details: result.error.flatten().fieldErrors }, 
        { status: 400 }
      );
    }

    const dataToUpdate = result.data;

    // Database operation
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: dataToUpdate,
    });

    // Map strictly to the defined DTO (omitting password Hash)
    const dto: UserDto = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      image: updatedUser.image,
      onboardingDone: updatedUser.onboardingDone,
      theme: updatedUser.theme,
      createdAt: updatedUser.createdAt.toISOString(),
    };

    return NextResponse.json(dto);
  } catch (error) {
    console.error("[USERS_ME_PATCH_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

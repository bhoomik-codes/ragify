import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { registerSchema } from "@/lib/validators";
import type { UserDto } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = registerSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, password } = result.data;

    // Reject conflicts securely explicitly preventing duplicates
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Cryptographic application (10 rounds hash mapped seamlessly natively supported)
    const hashedPassword = await bcryptjs.hash(password, 10);

    const createdUser = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Strip securely to public representation structure returning `HTTP 201 Created`
    const dto: UserDto = {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      image: createdUser.image,
      onboardingDone: createdUser.onboardingDone,
      theme: createdUser.theme,
      createdAt: createdUser.createdAt.toISOString(),
    };

    return NextResponse.json(dto, { status: 201 });
  } catch (error) {
    console.error("[POST_REGISTER_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } // Ensure robust application lifecycle hooks catch anything unknown securely
}

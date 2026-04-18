import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forgotPasswordSchema } from "@/lib/validators";
import { sendPasswordResetEmail } from "@/lib/mail";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = forgotPasswordSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = result.data;

    // Email Enumeration Prevention: We always return the same generic message.
    const genericSuccessResponse = NextResponse.json(
      { message: "If that email address exists in our database, you will receive a password reset link shortly." },
      { status: 200 }
    );

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // User doesn't exist. We silently do nothing and return.
      return genericSuccessResponse;
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create VerificationToken
    await db.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        }, // We actually just want to create one, or overwite existing for this user.
      },
      update: {},
      create: {
        identifier: email,
        token,
        expires,
      },
    });

    // Actually we can't upsert directly like this because identifier_token is the unique constraint, 
    // and we don't know the OLD token if they requested one previously.
    // Let's delete any existing tokens for this email first, then create a new one.
    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    // Send the email asynchronously
    sendPasswordResetEmail({ email, token }).catch(console.error);

    return genericSuccessResponse;
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

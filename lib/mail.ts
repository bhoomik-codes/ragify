import nodemailer from "nodemailer";

interface SendPasswordResetEmailParams {
  email: string;
  token: string;
}

export async function sendPasswordResetEmail({ email, token }: SendPasswordResetEmailParams) {
  const { SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_USER || !SMTP_PASS) {
    console.warn("[MAIL] SMTP configuration is missing! Falling back to console.");
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
    console.log("----------------------------------------");
    console.log(`To: ${email}`);
    console.log(`Subject: Reset your password for Ragify`);
    console.log(`Reset Link: ${resetUrl}`);
    console.log("----------------------------------------");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  const mailOptions = {
    from: `"Ragify Team" <${SMTP_USER}>`,
    to: email,
    subject: "Reset your password for Ragify",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2>Password Reset Request</h2>
        <p>You recently requested to reset your password for your Ragify account. Click the button below to proceed.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #7b42ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p>If you did not request a password reset, please ignore this email or reply to let us know. This password reset is only valid for the next 60 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
        <p style="font-size: 12px; color: #999;">If you're having trouble clicking the password reset button, copy and paste the URL below into your web browser:<br />${resetUrl}</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[MAIL] Password reset email sent:", info.messageId);
  } catch (error) {
    console.error("[MAIL_ERROR] Failed to send password reset email:", error);
    throw new Error("Failed to send email");
  }
}

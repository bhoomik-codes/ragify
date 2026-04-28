import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcryptjs from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (user?.id) {
        try {
          await db.user.update({
            where: { id: user.id },
            data: {
              lastLoginAt: new Date(),
              lastLoginIp: "Unknown", // NextAuth doesn't expose req in signIn args natively without advanced hacking
            }
          });
        } catch (e) {
          console.error("Failed to update lastLoginAt", e);
        }
      }
      return true;
    }
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const email = credentials.email as string;
        const user = await db.user.findUnique({ where: { email } });
        
        if (!user || !user.password) return null;
        
        const passwordsMatch = await bcryptjs.compare(credentials.password as string, user.password);
        
        if (passwordsMatch) {
          // Explicitly map exactly what gets put into the token/session (no password hash)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            theme: user.theme,
            onboardingDone: user.onboardingDone
          };
        }
        
        return null;
      }
    }),
  ],
});

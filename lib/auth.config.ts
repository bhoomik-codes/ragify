import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [], // We configure providers where they're needed (in auth.ts) to avoid edge runtime DB adapter issues.
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnProtectedRoute = 
        nextUrl.pathname.startsWith("/dashboard") || 
        nextUrl.pathname.startsWith("/settings") ||
        nextUrl.pathname.startsWith("/admin");
      
      if (isOnProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to /login
      } else if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup" || nextUrl.pathname === "/")) {
        // Redirect authenticated users trying to hit public landing / login to the dashboard
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    jwt({ token, user, trigger, session }) {
      // User object is only defined during the initial sign/in
      if (user) {
        token.id = user.id as string;
        token.theme = user.theme ?? "light";
        token.onboardingDone = user.onboardingDone ?? false;
      }
      // If we call NextAuth `useSession().update(...)`, this handles it
      if (trigger === "update" && session) {
        if (typeof session.theme === "string") token.theme = session.theme;
        if (typeof session.onboardingDone === "boolean") token.onboardingDone = session.onboardingDone;
        if (typeof session.name === "string") token.name = session.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.theme = token.theme as string;
        session.user.onboardingDone = token.onboardingDone as boolean;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

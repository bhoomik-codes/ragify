import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      theme: string;
      onboardingDone: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    theme?: string;
    onboardingDone?: boolean;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT {
    id: string;
    theme: string;
    onboardingDone: boolean;
  }
}

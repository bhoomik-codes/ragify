import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
 
export default NextAuth(authConfig).auth;
 
export const config = {
  // Pattern to protect everything except the public-facing areas (api, next static files, images, etc.)
  // Note: the `authorized` callback inside auth.config.ts processes the actual logic of what is protected.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

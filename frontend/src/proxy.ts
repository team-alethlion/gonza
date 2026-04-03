import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Use the standard Next.js matcher from the official documentation
  // Protect all routes except static assets, api, etc.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|logo.png|apple-icon.png|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$).*)"
  ],
};

import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { db } from "@/lib/db";

// Passwordless sign-in: Auth.js emails a magic link through Resend.
// Needs AUTH_SECRET, AUTH_RESEND_KEY, EMAIL_FROM and DATABASE_URL.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens }),
  // AUTH_RESEND_KEY, or RESEND_API_KEY as set by Vercel's Resend integration.
  providers: [Resend({ apiKey: process.env.AUTH_RESEND_KEY ?? process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM ?? "HomeHop <onboarding@resend.dev>" })],
  pages: { signIn: "/signin", verifyRequest: "/signin/check-email" },
  trustHost: true,
});

/** Session lookup that returns null instead of throwing when the database isn't set up. */
export async function safeAuth() {
  if (!process.env.DATABASE_URL) return null;
  try {
    return await auth();
  } catch (e) {
    console.error("auth() failed", e);
    return null;
  }
}

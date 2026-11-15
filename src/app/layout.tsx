import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import Link from "next/link";
import { safeAuth, signOut } from "@/auth";
import "./globals.css";

// Every page shows the signed-in state, so render per request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HomeHop – flights home for students abroad",
  description: "Search every airport you can reach and every airport near home, with trains, buses and bags counted.",
};

async function UserNav() {
  const session = await safeAuth();
  if (!session?.user) {
    return <Link href="/signin" className="rounded-lg px-3 py-2 font-semibold text-accent hover:bg-accent-soft">Sign in</Link>;
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/alerts" className="rounded-lg px-3 py-2 font-semibold text-accent hover:bg-accent-soft">My alerts</Link>
      <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
        <button className="rounded-lg px-3 py-2 text-muted hover:bg-ground">Sign out</button>
      </form>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
            <Link href="/" className="flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="text-accent" aria-hidden="true">
                <path d="M5 22c6-12 16-12 22 0" /><path d="M5 22h4M23 22h4" /><path d="M16 8v4" />
              </svg>
              <span className="flex flex-col leading-tight">
                <span className="font-display text-xl font-bold text-accent">HomeHop</span>
                <span className="text-sm text-muted">Round trips home, built around student life</span>
              </span>
            </Link>
            <UserNav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 pb-16 pt-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 pb-10 text-sm text-muted">
          Ground transport and extra-bag fees are estimates. Always check the final price with the airline before booking.
        </footer>
      </body>
    </html>
  );
}

import Link from "next/link";
import Results from "@/components/Results";
import { safeAuth } from "@/auth";
import { decodeQuery } from "@/lib/search-input";

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const input = q ? decodeQuery(q) : null;
  if (!input || !q) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl font-bold">That search link isn&apos;t valid</h1>
        <Link href="/" className="font-semibold text-accent">Start a new search</Link>
      </div>
    );
  }
  const signedIn = !!(await safeAuth())?.user;
  return <Results input={input} q={q} signedIn={signedIn} />;
}

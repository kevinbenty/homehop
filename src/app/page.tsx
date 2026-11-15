import SearchForm from "@/components/SearchForm";
import { decodeQuery } from "@/lib/search-input";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const initial = q ? decodeQuery(q) : null;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold leading-tight">Get home for the break. From any airport you can reach.</h1>
        <p className="max-w-3xl text-lg text-muted">
          Pick every airport you could leave from and every airport near home. HomeHop checks all the combinations, including flying back from a different airport, and adds the train or bus at each end.
        </p>
      </div>
      <SearchForm initial={initial} />
    </div>
  );
}

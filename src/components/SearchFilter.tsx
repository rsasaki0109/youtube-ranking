interface Props {
  query: string;
  onQuery: (q: string) => void;
  categories: string[];
  category: string | null;
  onCategory: (c: string | null) => void;
}

export default function SearchFilter({ query, onQuery, categories, category, onCategory }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="relative flex-1">
        <span className="sr-only">Search channels</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-neutral-400"
        >
          <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />
        </svg>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search channels…"
          className="w-full rounded-xl border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-900"
        />
      </label>
      {categories.length > 0 && (
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">Filter by category</span>
          <select
            value={category ?? ""}
            onChange={(e) => onCategory(e.target.value || null)}
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

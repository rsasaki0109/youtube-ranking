import { formatGrowth } from "../lib/format";
import type { HighlightEntry } from "../types";

interface Props {
  title: string;
  items: HighlightEntry[];
  onSelect: (url: string | null) => void;
}

/** Compact "surging this week" strip above the ranking table. */
export default function Highlights({ title, items, onSelect }: Props) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <h2 className="mb-2 text-sm font-bold text-amber-900">🔥 {title}</h2>
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((h, i) => (
          <li key={h.channelId ?? h.url ?? i}>
            <button
              onClick={() => onSelect(h.url)}
              className="flex w-full items-center gap-2 rounded-lg bg-white p-2 text-left shadow-sm transition-shadow hover:shadow"
            >
              <span className="text-xs font-bold tabular-nums text-amber-600">{i + 1}</span>
              {h.thumbnail ? (
                <img
                  src={h.thumbnail}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs text-neutral-500"
                >
                  ?
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-neutral-900">
                  {h.name ?? h.handle ?? "Unknown"}
                </span>
                <span className="block text-xs font-bold tabular-nums text-green-700">
                  {formatGrowth(h.growth)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

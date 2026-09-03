import { formatCompact, formatGrowth, formatInt } from "../lib/format";
import { metricLabelFor, type MainTab, type Period, type RankedChannel } from "../types";

interface Props {
  rows: RankedChannel[];
  tab: MainTab;
  period: Period;
  growth7dByKey: Map<string, number | null>;
  onSelect: (row: RankedChannel) => void;
}

function rowKey(r: RankedChannel, i: number): string {
  return r.channelId ?? r.url ?? r.name ?? `row-${i}`;
}

export default function RankingTable({ rows, tab, period, growth7dByKey, onSelect }: Props) {
  const metricLabel = metricLabelFor(tab, period);
  const isGrowth = tab === "subscriberGrowth" || tab === "viewGrowth";
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
        No channels match your search.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <th className="w-12 px-3 py-2.5 text-center font-semibold">Rank</th>
            <th className="px-3 py-2.5 font-semibold">Channel</th>
            <th className="px-3 py-2.5 text-right font-semibold">{metricLabel}</th>
            <th className="hidden px-3 py-2.5 text-right font-semibold md:table-cell">Subscribers</th>
            <th className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Change 7d</th>
            <th className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">Views</th>
            <th className="hidden px-3 py-2.5 text-right font-semibold lg:table-cell">Videos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={rowKey(r, i)}
              onClick={() => onSelect(r)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelect(r);
              }}
              tabIndex={0}
              title="Show trend chart"
              className={`cursor-pointer border-b border-neutral-100 last:border-0 ${
                r.rank <= 3 ? "bg-amber-50/60" : ""
              } hover:bg-neutral-50`}
            >
              <td className="px-3 py-2.5 text-center">
                <RankBadge rank={r.rank} />
              </td>
              <td className="max-w-0 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  {r.thumbnail ? (
                    <img
                      src={r.thumbnail}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="hidden h-9 w-9 shrink-0 rounded-full object-cover sm:block"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 sm:flex"
                    >
                      ?
                    </span>
                  )}
                  <div className="min-w-0">
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate font-semibold text-neutral-900 hover:text-red-600 hover:underline"
                      >
                        {r.name ?? r.handle ?? "Unknown channel"}
                      </a>
                    ) : (
                      <span className="block truncate font-semibold text-neutral-900">
                        {r.name ?? "Unknown channel"}
                      </span>
                    )}
                    <span className="block truncate text-xs text-neutral-500">
                      {[r.handle, r.category].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums">
                {isGrowth ? formatGrowth(r.value) : formatCompact(r.value)}
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-neutral-700 md:table-cell">
                {formatCompact(r.subscriberCount)}
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums sm:table-cell">
                <Change value={growth7dByKey.get(rowKey(r, i)) ?? null} />
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-neutral-700 lg:table-cell">
                {formatCompact(r.viewCount)}
              </td>
              <td className="hidden whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-neutral-700 lg:table-cell">
                {formatInt(r.videoCount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? "bg-yellow-400 text-yellow-950"
      : rank === 2
        ? "bg-neutral-300 text-neutral-800"
        : rank === 3
          ? "bg-amber-600/80 text-white"
          : "bg-neutral-100 text-neutral-600";
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums ${style}`}
    >
      {rank}
    </span>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-neutral-400">-</span>;
  const cls = value > 0 ? "text-green-700" : value < 0 ? "text-red-600" : "text-neutral-400";
  return <span className={cls}>{formatGrowth(value)}</span>;
}

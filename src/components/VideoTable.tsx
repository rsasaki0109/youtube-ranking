import { formatCompact } from "../lib/format";
import { categoryLabel, t, type Lang } from "../lib/i18n";
import type { TopVideo } from "../types";

interface Props {
  videos: TopVideo[];
  query: string;
  region: string;
  category: string | null;
  lang: Lang;
}

export default function VideoTable({ videos, query, region, category, lang }: Props) {
  const q = query.trim().toLowerCase();
  const rows = videos.filter((video) => {
    if (region !== "ALL" && video.country !== region) return false;
    if (category && video.category !== category) return false;
    if (!q) return true;
    return `${video.title ?? ""} ${video.channelName ?? ""}`.toLowerCase().includes(q);
  });
  if (rows.length === 0) {
    return <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">{t(lang, "noVideoMatch")}</div>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <th className="w-12 px-3 py-2.5 text-center">{t(lang, "colRank")}</th>
            <th className="px-3 py-2.5">{t(lang, "colVideo")}</th>
            <th className="px-3 py-2.5 text-right">{t(lang, "colViews")}</th>
            <th className="hidden px-3 py-2.5 text-right sm:table-cell">{t(lang, "colPublished")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((video) => (
            <tr key={video.videoId ?? video.url} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="px-3 py-2.5 text-center font-bold tabular-nums">{video.rank}</td>
              <td className="max-w-0 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-12 w-20 shrink-0 rounded object-cover" /> : <span className="h-12 w-20 shrink-0 rounded bg-neutral-200" />}
                  <div className="min-w-0">
                    <a href={video.url ?? "#"} target="_blank" rel="noopener noreferrer" className="block truncate font-semibold text-neutral-900 hover:text-red-600 hover:underline">
                      {video.title ?? "Untitled video"}
                    </a>
                    <span className="block truncate text-xs text-neutral-500">
                      {video.channelName ?? "Unknown channel"}{video.category ? ` · ${lang === "ja" ? categoryLabel(video.category, lang) : video.category}` : ""}
                    </span>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold tabular-nums">{formatCompact(video.viewCount)}</td>
              <td className="hidden whitespace-nowrap px-3 py-2.5 text-right text-xs text-neutral-500 sm:table-cell">{video.publishedAt ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

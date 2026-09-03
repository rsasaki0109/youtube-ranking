import { useMemo, useState } from "react";
import ChannelModal, { type ChannelGrowth } from "../components/ChannelModal";
import Highlights from "../components/Highlights";
import RankingTable from "../components/RankingTable";
import SearchFilter from "../components/SearchFilter";
import Tabs from "../components/Tabs";
import VideoTable from "../components/VideoTable";
import { t, type Lang } from "../lib/i18n";
import {
  ALL_REGIONS,
  defaultRegion,
  rankingKeyFor,
  seriesKeyOf,
  type HighlightEntry,
  type MainTab,
  type Period,
  type RankedChannel,
  type RankingsData,
  type Region,
} from "../types";

/** Re-assign competition ranks (1,2,2,4) within the currently visible rows. */
function renumber(rows: RankedChannel[]): RankedChannel[] {
  const out: RankedChannel[] = [];
  let rank = 0;
  let prev: number | null | undefined = undefined;
  let first = true;
  rows.forEach((r, i) => {
    if (first || r.value !== prev) {
      rank = i + 1;
      first = false;
    }
    prev = r.value;
    out.push({ ...r, rank });
  });
  return out;
}

function growthMaps(data: RankingsData) {
  const by = (list: RankedChannel[]) => {
    const m = new Map<string, number | null>();
    list.forEach((r, i) => m.set(r.channelId ?? r.url ?? r.name ?? `row-${i}`, r.growthValue ?? r.value));
    return m;
  };
  return {
    subs7d: by(data.channels.subscriberGrowth7d),
    subs30d: by(data.channels.subscriberGrowth30d),
    views7d: by(data.channels.viewGrowth7d),
    views30d: by(data.channels.viewGrowth30d),
  };
}

export default function RankingPage({ data, lang }: { data: RankingsData; lang: Lang }) {
  const [tab, setTab] = useState<MainTab>("subscribers");
  const [period, setPeriod] = useState<Period>("7d");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<RankedChannel | null>(null);

  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const row of data.channels.subscribers) {
      if (row.country) set.add(row.country);
    }
    return [...set].sort();
  }, [data]);
  const [region, setRegion] = useState<Region>(() => defaultRegion(regions));

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const row of data.channels.subscribers) {
      if (region !== ALL_REGIONS && row.country !== region) continue;
      if (row.category) set.add(row.category);
    }
    return [...set].sort();
  }, [data, region]);

  const growth = useMemo(() => growthMaps(data), [data]);
  const growth7dByKey = growth.subs7d;

  const isVideoTab = tab === "topVideos";
  const rows: RankedChannel[] = useMemo(() => {
    if (isVideoTab) return [];
    const key = rankingKeyFor(tab, period);
    const q = query.trim().toLowerCase();
    const filtered = data.channels[key].filter((r) => {
      if (region !== ALL_REGIONS && r.country !== region) return false;
      if (category && r.category !== category) return false;
      if (!q) return true;
      return (
        (r.name ?? "").toLowerCase().includes(q) || (r.handle ?? "").toLowerCase().includes(q)
      );
    });
    return renumber(filtered);
  }, [data, tab, period, query, category, region, isVideoTab]);

  const showHighlights = !isVideoTab && query.trim() === "" && category === null;
  const subsHighlights = showHighlights ? (data.highlights?.subscriberGrowth7d ?? []) : [];
  const viewsHighlights = showHighlights ? (data.highlights?.viewGrowth7d ?? []) : [];
  const highlightTab: MainTab | null = tab === "views" || tab === "viewGrowth" ? "views" : "subscribers";
  const highlightItems: HighlightEntry[] =
    highlightTab === "views" ? viewsHighlights : subsHighlights;

  const selectedKey = selected ? (selected.channelId ?? selected.url ?? selected.name ?? "") : "";
  const selectedGrowth: ChannelGrowth = {
    subs7d: growth.subs7d.get(selectedKey) ?? null,
    subs30d: growth.subs30d.get(selectedKey) ?? null,
    views7d: growth.views7d.get(selectedKey) ?? null,
    views30d: growth.views30d.get(selectedKey) ?? null,
  };

  return (
    <div className="space-y-4">
      <Tabs tab={tab} period={period} onTab={setTab} onPeriod={setPeriod} lang={lang} />
      <SearchFilter
        query={query}
        onQuery={setQuery}
        regions={regions}
        region={region}
        onRegion={(r) => {
          setRegion(r);
          setCategory(null);
        }}
        categories={categories}
        category={category}
        onCategory={setCategory}
        lang={lang}
        placeholder={isVideoTab ? t(lang, "searchVideosPlaceholder") : t(lang, "searchPlaceholder")}
      />
      {highlightItems.length > 0 && (
        <Highlights
            title={highlightTab === "views" ? t(lang, "trendingViews") : t(lang, "trendingSubs")}
          items={highlightItems}
          onSelect={(url) => {
            if (!url) return;
            const found =
              data.channels.subscribers.find((r) => r.url === url) ??
              data.channels.subscribers.find((r) => r.channelId === url);
            if (found) setSelected(found);
          }}
        />
      )}
      <p className="text-xs text-neutral-500">
        {isVideoTab ? `${data.topVideos?.length ?? 0} ${t(lang, "videoCount")}` : `${rows.length} ${t(lang, "channelCount")} · ${t(lang, "tapForChart")}`}
        {!isVideoTab && (tab === "subscriberGrowth" || tab === "viewGrowth")
          ? ` · ${t(lang, "growthHint")}`
          : ""}
      </p>
      {isVideoTab ? (
        <VideoTable videos={data.topVideos ?? []} query={query} region={region} lang={lang} />
      ) : (
        <RankingTable
          rows={rows}
          tab={tab}
          period={period}
          growth7dByKey={growth7dByKey}
          onSelect={setSelected}
          lang={lang}
        />
      )}
      {selected && (
        <ChannelModal
          channel={selected}
          series={data.series?.[seriesKeyOf(selected)] ?? []}
          growth={selectedGrowth}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

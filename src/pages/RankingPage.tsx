import { useMemo, useState } from "react";
import RankingTable from "../components/RankingTable";
import SearchFilter from "../components/SearchFilter";
import Tabs from "../components/Tabs";
import {
  ALL_REGIONS,
  defaultRegion,
  rankingKeyFor,
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

export default function RankingPage({ data }: { data: RankingsData }) {
  const [tab, setTab] = useState<MainTab>("subscribers");
  const [period, setPeriod] = useState<Period>("7d");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

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

  const growth7d = useMemo(() => {
    const map = new Map<string, number | null>();
    data.channels.subscriberGrowth7d.forEach((r, i) => {
      map.set(r.channelId ?? r.url ?? r.name ?? `row-${i}`, r.growthValue ?? r.value);
    });
    return map;
  }, [data]);

  const rows: RankedChannel[] = useMemo(() => {
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
  }, [data, tab, period, query, category, region]);

  return (
    <div className="space-y-4">
      <Tabs tab={tab} period={period} onTab={setTab} onPeriod={setPeriod} />
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
      />
      <p className="text-xs text-neutral-500">
        {rows.length} channels
        {tab === "subscriberGrowth" || tab === "viewGrowth"
          ? " · 7d / 30d recommended (daily counts are rounded by YouTube)"
          : ""}
      </p>
      <RankingTable rows={rows} tab={tab} period={period} growth7dByKey={growth7d} />
    </div>
  );
}

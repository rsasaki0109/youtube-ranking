import { useMemo, useState } from "react";
import RankingTable from "../components/RankingTable";
import SearchFilter from "../components/SearchFilter";
import Tabs from "../components/Tabs";
import {
  rankingKeyFor,
  type MainTab,
  type Period,
  type RankedChannel,
  type RankingsData,
} from "../types";

export default function RankingPage({ data }: { data: RankingsData }) {
  const [tab, setTab] = useState<MainTab>("subscribers");
  const [period, setPeriod] = useState<Period>("7d");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const row of data.channels.subscribers) {
      if (row.category) set.add(row.category);
    }
    return [...set].sort();
  }, [data]);

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
    return data.channels[key].filter((r) => {
      if (category && r.category !== category) return false;
      if (!q) return true;
      return (
        (r.name ?? "").toLowerCase().includes(q) || (r.handle ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, tab, period, query, category]);

  return (
    <div className="space-y-4">
      <Tabs tab={tab} period={period} onTab={setTab} onPeriod={setPeriod} />
      <SearchFilter
        query={query}
        onQuery={setQuery}
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

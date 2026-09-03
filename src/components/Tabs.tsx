import { t, type Lang } from "../lib/i18n";
import { PERIODS, type MainTab, type Period } from "../types";

interface Props {
  tab: MainTab;
  period: Period;
  onTab: (t: MainTab) => void;
  onPeriod: (p: Period) => void;
  lang: Lang;
}

const TAB_KEYS: { key: MainTab; label: "tabSubscribers" | "tabSubscriberGrowth" | "tabViews" | "tabViewGrowth" | "tabVideos" | "tabTopVideos" }[] = [
  { key: "subscribers", label: "tabSubscribers" },
  { key: "subscriberGrowth", label: "tabSubscriberGrowth" },
  { key: "views", label: "tabViews" },
  { key: "viewGrowth", label: "tabViewGrowth" },
  { key: "videos", label: "tabVideos" },
  { key: "topVideos", label: "tabTopVideos" },
];

export default function Tabs({ tab, period, onTab, onPeriod, lang }: Props) {
  const isGrowth = tab === "subscriberGrowth" || tab === "viewGrowth";
  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Ranking metric"
        className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1"
      >
        {TAB_KEYS.map((tb) => (
          <button
            key={tb.key}
            role="tab"
            aria-selected={tab === tb.key}
            onClick={() => onTab(tb.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              tab === tb.key ? "bg-white text-neutral-900 shadow" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t(lang, tb.label)}
          </button>
        ))}
      </div>
      {isGrowth && (
        <div role="tablist" aria-label="Growth period" className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={period === p.key}
              onClick={() => onPeriod(p.key)}
              className={`rounded-full border px-4 py-1 text-sm font-semibold transition-colors ${
                period === p.key
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

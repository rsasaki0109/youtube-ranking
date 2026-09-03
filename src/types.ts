export interface RankedChannel {
  rank: number;
  channelId: string | null;
  name: string | null;
  handle: string | null;
  url: string | null;
  thumbnail: string | null;
  subscriberCount: number | null;
  viewCount: number | null;
  videoCount: number | null;
  description: string | null;
  category: string | null;
  /** ISO country code from config/channels.yml (e.g. "JP"). Null when unset. */
  country: string | null;
  updatedAt: string | null;
  /** Sort value of the current ranking (count or growth). */
  value: number | null;
  /** Only present on growth rankings. */
  growthValue?: number | null;
}

export type RankingKey =
  | "subscribers"
  | "views"
  | "videos"
  | "subscriberGrowth24h"
  | "subscriberGrowth7d"
  | "subscriberGrowth30d"
  | "viewGrowth24h"
  | "viewGrowth7d"
  | "viewGrowth30d";

export interface RankingsData {
  generatedAt: string | null;
  channels: Record<RankingKey, RankedChannel[]>;
  meta?: { channelCount: number; historyDays: number };
}

export type MainTab =
  | "subscribers"
  | "subscriberGrowth"
  | "views"
  | "viewGrowth"
  | "videos";

export type Period = "24h" | "7d" | "30d";

export const MAIN_TABS: { key: MainTab; label: string }[] = [
  { key: "subscribers", label: "Subscribers" },
  { key: "subscriberGrowth", label: "Subscriber Growth" },
  { key: "views", label: "Views" },
  { key: "viewGrowth", label: "View Growth" },
  { key: "videos", label: "Videos" },
];

export const PERIODS: { key: Period; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

/** Region filter value: "ALL" or an ISO country code. */
export type Region = string;

export const ALL_REGIONS: Region = "ALL";

/** Prefer Japan when JP channels exist; otherwise show everything. */
export function defaultRegion(countries: string[]): Region {
  return countries.includes("JP") ? "JP" : ALL_REGIONS;
}

const REGION_NAMES: Record<string, string> = {
  JP: "Japan",
  US: "United States",
};

export function regionLabel(region: Region): string {
  if (region === ALL_REGIONS) return "All regions";
  return REGION_NAMES[region] ?? region;
}

export function rankingKeyFor(tab: MainTab, period: Period): RankingKey {
  switch (tab) {
    case "subscribers":
      return "subscribers";
    case "views":
      return "views";
    case "videos":
      return "videos";
    case "subscriberGrowth":
      return `subscriberGrowth${period}` as RankingKey;
    case "viewGrowth":
      return `viewGrowth${period}` as RankingKey;
  }
}

export function metricLabelFor(tab: MainTab, period: Period): string {
  switch (tab) {
    case "subscribers":
      return "Subscribers";
    case "views":
      return "Views";
    case "videos":
      return "Videos";
    case "subscriberGrowth":
      return `Subs +${period}`;
    case "viewGrowth":
      return `Views +${period}`;
  }
}

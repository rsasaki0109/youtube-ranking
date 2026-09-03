// Minimal dependency-free i18n. Stored data is unaffected; only UI strings.

export type Lang = "ja" | "en";

const STRINGS = {
  ranking: { ja: "ランキング", en: "Ranking" },
  about: { ja: "このサイトについて", en: "About" },
  updated: { ja: "更新", en: "Updated" },
  tabSubscribers: { ja: "登録者数", en: "Subscribers" },
  tabSubscriberGrowth: { ja: "登録者増加", en: "Subscriber Growth" },
  tabViews: { ja: "再生数", en: "Views" },
  tabViewGrowth: { ja: "再生増加", en: "View Growth" },
  tabVideos: { ja: "動画本数", en: "Videos" },
  tabTopVideos: { ja: "人気動画", en: "Top Videos" },
  searchPlaceholder: { ja: "チャンネル検索…", en: "Search channels…" },
  searchVideosPlaceholder: { ja: "動画・チャンネル検索…", en: "Search videos…" },
  allRegions: { ja: "すべての地域", en: "All regions" },
  allCategories: { ja: "すべてのジャンル", en: "All categories" },
  colRank: { ja: "順位", en: "Rank" },
  colChannel: { ja: "チャンネル", en: "Channel" },
  colVideo: { ja: "動画", en: "Video" },
  colViews: { ja: "再生数", en: "Views" },
  colPublished: { ja: "公開日", en: "Published" },
  colChange7d: { ja: "7日間増減", en: "Change 7d" },
  channelCount: { ja: "チャンネル", en: "channels" },
  videoCount: { ja: "本の動画", en: "videos" },
  tapForChart: { ja: "行タップで推移グラフ", en: "tap a row for its trend chart" },
  growthHint: {
    ja: "7日・30日がおすすめ（登録者数は丸め表示のため）",
    en: "7d / 30d recommended (daily counts are rounded by YouTube)",
  },
  noMatch: { ja: "条件に合うチャンネルがありません。", en: "No channels match your search." },
  noVideoMatch: { ja: "条件に合う動画がありません。", en: "No videos match your search." },
  trendingSubs: { ja: "今週の登録者急上昇", en: "Trending subscribers this week" },
  trendingViews: { ja: "今週の再生急上昇", en: "Trending views this week" },
  close: { ja: "閉じる", en: "Close" },
  openOnYouTube: { ja: "YouTubeで開く →", en: "Open on YouTube →" },
  notEnoughHistory: {
    ja: "履歴がまだ不足しています。数日後の更新をお待ちください。",
    en: "Not enough history yet — check back after a few daily updates.",
  },
  loadError: { ja: "ランキングデータを読み込めませんでした。", en: "Could not load ranking data." },
  footer: {
    ja: "YouTube APIキー不使用 · yt-dlp + GitHub Actions + GitHub Pages · MITライセンス",
    en: "Built without any YouTube API key · yt-dlp + GitHub Actions + GitHub Pages · MIT License",
  },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(lang: Lang, key: StringKey): string {
  return STRINGS[key][lang];
}

const CATEGORY_LABELS: Record<string, { ja: string; en: string }> = {
  entertainment: { ja: "エンタメ", en: "Entertainment" },
  comedy: { ja: "お笑い", en: "Comedy" },
  gaming: { ja: "ゲーム", en: "Gaming" },
  vtuber: { ja: "VTuber", en: "VTuber" },
  music: { ja: "音楽", en: "Music" },
  anime: { ja: "アニメ", en: "Anime" },
  cooking: { ja: "料理", en: "Cooking" },
  news: { ja: "ニュース", en: "News" },
  tech: { ja: "テック", en: "Tech" },
  education: { ja: "学び", en: "Education" },
  sports: { ja: "スポーツ", en: "Sports" },
  kids: { ja: "キッズ", en: "Kids" },
};

export function categoryLabel(category: string, lang: Lang): string {
  const entry = CATEGORY_LABELS[category];
  if (!entry) return category;
  return lang === "ja" ? entry.ja : entry.en;
}

const REGION_LABELS: Record<string, { ja: string; en: string }> = {
  ALL: { ja: "すべての地域", en: "All regions" },
  JP: { ja: "日本", en: "Japan" },
  US: { ja: "アメリカ", en: "United States" },
};

export function regionLabel(region: string, lang: Lang): string {
  const entry = REGION_LABELS[region];
  if (!entry) return region;
  return lang === "ja" ? entry.ja : entry.en;
}

const STORAGE_KEY = "yr-lang";

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ja" || saved === "en") return saved;
  } catch {
    /* storage unavailable */
  }
  try {
    return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
  } catch {
    return "en";
  }
}

export function saveLang(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable */
  }
}

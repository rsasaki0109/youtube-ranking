import { useCallback, useEffect, useState } from "react";
import Header from "./components/Header";
import { loadRankings } from "./lib/data";
import AboutPage from "./pages/AboutPage";
import RankingPage from "./pages/RankingPage";
import type { RankingsData } from "./types";

type Page = "ranking" | "about";

function pageFromHash(): Page {
  return window.location.hash.startsWith("#/about") ? "about" : "ranking";
}

export default function App() {
  const [page, setPage] = useState<Page>(() => pageFromHash());
  const [data, setData] = useState<RankingsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    loadRankings().then(setData).catch((e: unknown) => {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    });
  }, []);

  const navigate = useCallback((p: Page) => {
    window.location.hash = p === "about" ? "#/about" : "#/";
    setPage(p);
  }, []);

  return (
    <div className="min-h-screen text-neutral-900">
      <Header page={page} onNavigate={navigate} generatedAt={data?.generatedAt ?? null} />
      <main className="mx-auto max-w-5xl px-4 py-6">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            <p className="font-bold">Could not load ranking data.</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : data === null ? (
          <div className="space-y-2" aria-label="Loading">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-200/70" />
            ))}
          </div>
        ) : page === "ranking" ? (
          <RankingPage data={data} />
        ) : (
          <AboutPage />
        )}
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-neutral-400">
        Built without any YouTube API key · yt-dlp + GitHub Actions + GitHub Pages · MIT License
      </footer>
    </div>
  );
}

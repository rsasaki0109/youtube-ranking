export default function AboutPage() {
  return (
    <article className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 text-sm leading-relaxed text-neutral-700">
      <section className="space-y-2">
        <h2 className="text-lg font-bold text-neutral-900">What is this?</h2>
        <p>
          YouTube Ranking is an automated, API-key-free ranking site for YouTube channels. Channel
          metadata is collected with{" "}
          <a
            className="text-red-600 hover:underline"
            href="https://github.com/yt-dlp/yt-dlp"
            target="_blank"
            rel="noopener noreferrer"
          >
            yt-dlp
          </a>
          , snapshots are stored as JSON in the repository, rankings are pre-computed in Python,
          and the site is published as a fully static page via GitHub Pages.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>No YouTube API key</li>
          <li>No Google Cloud</li>
          <li>No database</li>
          <li>No server</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-neutral-900">Metrics</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Subscribers / total views / video count (current values)</li>
          <li>Growth over 24h / 7d / 30d: current value minus the closest past snapshot</li>
        </ul>
        <p>
          Because YouTube rounds public subscriber counts, small short-term deltas can be imprecise.
          Prefer the <strong>7-day and 30-day growth</strong> rankings for trend analysis.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-neutral-900">How it updates</h2>
        <ol className="list-inside list-decimal space-y-1">
          <li>
            Edit <code className="rounded bg-neutral-100 px-1">config/channels.yml</code> with
            channel URLs.
          </li>
          <li>GitHub Actions fetches public metadata daily via yt-dlp.</li>
          <li>
            Snapshots are saved to <code className="rounded bg-neutral-100 px-1">data/history/</code>,
            rankings to <code className="rounded bg-neutral-100 px-1">data/rankings.json</code>.
          </li>
          <li>GitHub Pages redeploys the static site automatically.</li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-neutral-900">Limitations</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>This project does not use the official YouTube API, so data availability is not guaranteed.</li>
          <li>YouTube layout/spec changes may require a yt-dlp upgrade.</li>
          <li>Total views / video counts are often not exposed by YouTube's public pages and show as “-”.</li>
          <li>Channel-only rankings — no video rankings, likes, comments, or engagement metrics.</li>
        </ul>
      </section>
    </article>
  );
}

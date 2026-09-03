import { saveLang, t, type Lang } from "../lib/i18n";

interface Props {
  page: "ranking" | "about";
  onNavigate: (page: "ranking" | "about") => void;
  generatedAt: string | null;
  lang: Lang;
  onLang: (lang: Lang) => void;
}

export default function Header({ page, onNavigate, generatedAt, lang, onLang }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("ranking");
          }}
          className="flex items-center gap-2"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="text-lg font-bold tracking-tight">YouTube Ranking</span>
        </a>
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
          <NavButton active={page === "ranking"} onClick={() => onNavigate("ranking")}>
            {t(lang, "ranking")}
          </NavButton>
          <NavButton active={page === "about"} onClick={() => onNavigate("about")}>
            {t(lang, "about")}
          </NavButton>
          <button
            onClick={() => {
              const next: Lang = lang === "ja" ? "en" : "ja";
              saveLang(next);
              onLang(next);
            }}
            aria-label="Switch language"
            className="rounded-full border border-neutral-300 px-2.5 py-1.5 text-xs font-bold text-neutral-600 hover:border-neutral-500"
          >
            {lang === "ja" ? "EN" : "日本語"}
          </button>
        </nav>
      </div>
      {generatedAt && (
        <div className="border-t border-neutral-100">
          <p className="mx-auto max-w-5xl px-4 py-1 text-right text-[11px] text-neutral-500">
            {t(lang, "updated")}: {formatDate(generatedAt, lang)}
          </p>
        </div>
      )}
    </header>
  );
}

function NavButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 transition-colors ${
        active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );
}

function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === "ja" ? "ja-JP" : "en-US", { dateStyle: "medium", timeStyle: "short" });
}

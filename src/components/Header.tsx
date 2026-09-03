interface Props {
  page: "ranking" | "about";
  onNavigate: (page: "ranking" | "about") => void;
  generatedAt: string | null;
}

export default function Header({ page, onNavigate, generatedAt }: Props) {
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
            Ranking
          </NavButton>
          <NavButton active={page === "about"} onClick={() => onNavigate("about")}>
            About
          </NavButton>
        </nav>
      </div>
      {generatedAt && (
        <div className="border-t border-neutral-100">
          <p className="mx-auto max-w-5xl px-4 py-1 text-right text-[11px] text-neutral-500">
            Updated: {formatDate(generatedAt)}
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

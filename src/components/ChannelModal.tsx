import { useEffect, useState } from "react";
import { formatCompact, formatGrowth, formatInt } from "../lib/format";
import type { RankedChannel, SeriesPoint } from "../types";

export interface ChannelGrowth {
  subs7d: number | null;
  subs30d: number | null;
  views7d: number | null;
  views30d: number | null;
}

interface Props {
  channel: RankedChannel;
  series: SeriesPoint[];
  growth: ChannelGrowth;
  onClose: () => void;
}

type Metric = "subscribers" | "views";

/** Channel detail modal with a dependency-free SVG trend chart. */
export default function ChannelModal({ channel, series, growth, onClose }: Props) {
  const [metric, setMetric] = useState<Metric>("subscribers");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = channel.name ?? channel.handle ?? "Unknown channel";

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {channel.thumbnail ? (
            <img
              src={channel.thumbnail}
              alt=""
              referrerPolicy="no-referrer"
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold">{title}</h2>
            <p className="truncate text-xs text-neutral-500">
              {[channel.handle, channel.category].filter(Boolean).join(" · ")}
            </p>
            {channel.url && (
              <a
                href={channel.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Open on YouTube →
              </a>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-neutral-100 px-2.5 py-1 text-sm text-neutral-600 hover:bg-neutral-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex gap-1 text-sm font-semibold">
          {(["subscribers", "views"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded-full px-3 py-1 capitalize transition-colors ${
                metric === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="mt-2">
          <TrendChart
            points={series.map((p) => ({ date: p.date, value: p[metric] }))}
            color={metric === "subscribers" ? "#dc2626" : "#4f46e5"}
          />
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="Subscribers" value={formatCompact(channel.subscriberCount)} />
          <Stat label="+7d subs" value={formatGrowth(growth.subs7d)} accent />
          <Stat label="+30d subs" value={formatGrowth(growth.subs30d)} accent />
          <Stat label="Views" value={formatCompact(channel.viewCount)} />
          <Stat label="Videos" value={formatInt(channel.videoCount)} />
          <Stat label="+7d views" value={formatGrowth(growth.views7d)} accent />
        </dl>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={`font-bold tabular-nums ${accent ? "text-green-700" : "text-neutral-900"}`}>{value}</dd>
    </div>
  );
}

function TrendChart({ points, color }: { points: { date: string; value: number | null }[]; color: string }) {
  const W = 320;
  const H = 130;
  const PAD = 8;
  const valid = points.filter((p) => p.value !== null && p.value !== undefined) as {
    date: string;
    value: number;
  }[];
  if (valid.length < 2) {
    return (
      <p className="rounded-lg bg-neutral-50 py-8 text-center text-sm text-neutral-500">
        Not enough history yet — check back after a few daily updates.
      </p>
    );
  }
  const values = valid.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / (valid.length - 1)) * (W - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - min) / span) * (H - PAD * 2 - 14);
  const line = valid.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${PAD},${H - 14} ${line} ${W - PAD},${H - 14}`;
  const id = `g${color.replace("#", "")}`;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trend chart">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.25" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${id})`} />
        <polyline points={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx={x(valid.length - 1)} cy={y(valid[valid.length - 1].value)} r="4" fill={color} />
      </svg>
      <figcaption className="flex justify-between text-[11px] tabular-nums text-neutral-500">
        <span>{valid[0].date}</span>
        <span className="font-bold" style={{ color }}>
          {formatCompact(valid[valid.length - 1].value)}
        </span>
        <span>{valid[valid.length - 1].date}</span>
      </figcaption>
    </figure>
  );
}

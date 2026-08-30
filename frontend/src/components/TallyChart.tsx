"use client";
// =============================================================================
// TallyChart – animated vote progress bars
// =============================================================================
import { Tally } from "@/lib/useMotionTally";

interface TallyChartProps {
  tally: Tally;
  isConnected: boolean;
  isLoading: boolean;
}

const VOTE_OPTS = [
  { key: "YES",     label: "Yes",     fillClass: "tally-fill-yes",     color: "#22c55e" },
  { key: "NO",      label: "No",      fillClass: "tally-fill-no",      color: "#ef4444" },
  { key: "ABSTAIN", label: "Abstain", fillClass: "tally-fill-abstain", color: "#94a3b8" },
] as const;

export default function TallyChart({ tally, isConnected, isLoading }: TallyChartProps) {
  const total = tally.total || 1; // avoid /0

  return (
    <div className="tally-bar-wrapper">
      {/* Live indicator */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted font-bold" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Live Vote Tally
        </span>
        {isLoading ? (
          <span className="badge badge-draft">
            <span className="spin" style={{ fontSize: "10px" }}>⟳</span> Loading
          </span>
        ) : isConnected ? (
          <span className="badge badge-live">
            <span className="live-dot" /> Realtime
          </span>
        ) : (
          <span className="badge badge-draft">⚪ Connecting…</span>
        )}
      </div>

      {VOTE_OPTS.map(({ key, label, fillClass, color }) => {
        const count  = tally[key as keyof Tally] as number;
        const pct    = Math.round((count / total) * 100);
        const width  = tally.total === 0 ? 0 : (count / total) * 100;

        return (
          <div key={key} className="tally-row">
            <span className="tally-label" style={{ color }}>{label}</span>
            <div className="tally-track" role="progressbar" aria-valuenow={count} aria-valuemax={tally.total} aria-label={`${label} votes`}>
              <div
                className={`tally-fill ${fillClass}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="tally-count" style={{ color }}>
              {count}
              <span style={{ color: "var(--color-text-muted)", fontSize: "0.7rem", marginLeft: "2px" }}>
                {tally.total > 0 ? ` (${pct}%)` : ""}
              </span>
            </span>
          </div>
        );
      })}

      <div className="tally-total">
        <span>🗳️</span>
        <span>
          <strong style={{ color: "var(--color-text)" }}>{tally.total}</strong> vote{tally.total !== 1 ? "s" : ""} cast
        </span>
      </div>
    </div>
  );
}

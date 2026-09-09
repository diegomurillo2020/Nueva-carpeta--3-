"use client";
// =============================================================================
// TallyChart – animated vote progress bars
// =============================================================================
import { Tally } from "@/lib/useMotionTally";
import { LoaderCircle, Vote } from "lucide-react";

interface TallyChartProps {
  tally: Tally;
  isConnected: boolean;
  isLoading: boolean;
  isRealtime?: boolean;
}

const VOTE_OPTS = [
  { key: "YES",     label: "SÍ",          fillClass: "tally-fill-yes",     color: "#15803d" },
  { key: "NO",      label: "NO",          fillClass: "tally-fill-no",      color: "#b91c1c" },
  { key: "ABSTAIN", label: "ABSTENCIÓN", fillClass: "tally-fill-abstain", color: "#475569" },
] as const;

export default function TallyChart({ tally, isConnected, isLoading, isRealtime = true }: TallyChartProps) {
  const total = tally.total || 1; // avoid /0

  return (
    <div className="tally-bar-wrapper">
      {/* Live indicator */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted font-bold" style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Cuadro de Votos en Vivo
        </span>
        {isLoading ? (
          <span className="badge badge-draft">
            <LoaderCircle className="spin" size={12} /> Cargando
          </span>
        ) : isRealtime && isConnected ? (
          <span className="badge badge-live">
            <span className="live-dot" /> Tiempo real
          </span>
        ) : !isRealtime ? (
          <span className="badge badge-draft">Resultados históricos</span>
        ) : (
          <span className="badge badge-draft">⚪ Conectando…</span>
        )}
      </div>

      {VOTE_OPTS.map(({ key, label, fillClass, color }) => {
        const count  = tally[key as keyof Tally] as number;
        const pct    = Math.round((count / total) * 100);
        const width  = tally.total === 0 ? 0 : (count / total) * 100;

        return (
          <div key={key} className="tally-row">
            <span className="tally-label" style={{ color, fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.03em" }}>{label}</span>
            <div className="tally-track" role="progressbar" aria-valuenow={count} aria-valuemax={tally.total} aria-label={`${label} votos`}>
              <div
                className={`tally-fill ${fillClass}`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="tally-count" style={{ color }}>
              {count}
              <span style={{ color: "var(--text-2)", fontSize: "0.8rem", marginLeft: "2px", fontWeight: 700 }}>
                {tally.total > 0 ? ` (${pct}%)` : ""}
              </span>
            </span>
          </div>
        );
      })}

      <div className="tally-total">
          <Vote size={16} />
        <span>
          <strong style={{ color: "var(--text)" }}>{tally.total}</strong> voto{tally.total !== 1 ? "s" : ""} registrado{tally.total !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

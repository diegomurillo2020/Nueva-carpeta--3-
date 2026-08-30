"use client";
// =============================================================================
// MotionCard – displays a single motion with live realtime tally
// =============================================================================
import TallyChart from "./TallyChart";
import { useMotionTally } from "@/lib/useMotionTally";

interface Motion {
  id: string;
  title: string;
  description?: string;
  status: "OPEN" | "CLOSED";
  options: string[];
  durationSeconds?: number;
  openedAt?: string;
  orderIndex: number;
}

interface MotionCardProps {
  motion: Motion;
}

export default function MotionCard({ motion }: MotionCardProps) {
  const { tally, isConnected, isLoading, error } = useMotionTally(
    motion.status === "OPEN" ? motion.id : null
  );

  return (
    <div className="glass-card motion-card">
      {/* Header */}
      <div className="motion-card-header">
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-2 mb-4" style={{ marginBottom: "0.5rem" }}>
            <span
              className="text-xs font-mono"
              style={{ color: "var(--color-text-muted)" }}
            >
              #{motion.orderIndex + 1}
            </span>
            <span
              className={`badge ${motion.status === "OPEN" ? "badge-open" : "badge-closed"}`}
            >
              {motion.status === "OPEN" ? "⚡ Open" : "🔒 Closed"}
            </span>
          </div>
          <h3 className="motion-title">{motion.title}</h3>
          {motion.description && (
            <p className="motion-desc" style={{ marginTop: "0.375rem" }}>{motion.description}</p>
          )}
        </div>

        {/* Duration badge */}
        {motion.durationSeconds && motion.status === "OPEN" && (
          <div
            style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.25)",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 0.75rem",
              textAlign: "center",
              minWidth: "64px",
            }}
          >
            <div className="font-mono font-bold" style={{ fontSize: "1.25rem", color: "var(--color-accent-light)" }}>
              {motion.durationSeconds}
            </div>
            <div className="text-xs text-muted">seconds</div>
          </div>
        )}
      </div>

      {/* Tally */}
      <div
        style={{
          background: "rgba(0,0,0,0.2)",
          borderRadius: "var(--radius-md)",
          padding: "1.25rem",
          border: "1px solid var(--color-border)",
        }}
      >
        {motion.status === "CLOSED" && tally.total === 0 ? (
          <p className="text-sm text-muted" style={{ textAlign: "center", padding: "1rem 0" }}>
            📊 Motion closed — no votes were recorded.
          </p>
        ) : (
          <TallyChart tally={tally} isConnected={isConnected} isLoading={isLoading} />
        )}
        {error && (
          <p className="text-xs text-danger" style={{ marginTop: "0.5rem" }}>⚠️ {error}</p>
        )}
      </div>

      {/* Allowed choices */}
      <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
        {motion.options.map((opt) => (
          <span
            key={opt}
            className="badge"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
            }}
          >
            {opt === "YES" ? "✅" : opt === "NO" ? "❌" : "⚪"} {opt}
          </span>
        ))}
      </div>
    </div>
  );
}

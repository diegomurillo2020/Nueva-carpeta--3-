"use client";
// =============================================================================
// MotionCard – displays a single motion with live realtime tally
// =============================================================================
import TallyChart from "./TallyChart";
import { Tally, useMotionTally } from "@/lib/useMotionTally";
import { useState } from "react";

interface Motion {
  id: string;
  title: string;
  description?: string;
  status: "OPEN" | "CLOSED";
  options: string[];
  durationSeconds?: number;
  openedAt?: string;
  orderIndex: number;
  tally?: Tally;
}

interface MotionCardProps {
  motion: Motion;
  meetingStatus?: "CLOSED" | "DRAFT" | "LIVE" | string;
  canVote?: boolean;
  hasVoted?: boolean;
  onVote?: (motionId: string, choice: string) => Promise<void>;
}

const VOTE_LABELS: Record<string, string> = {
  YES: "SÍ",
  NO: "NO",
  ABSTAIN: "ABSTENCIÓN",
};

const CLOSED_RESULT_ITEMS = [
  { key: "total", label: "Votos totales", icon: "📊", className: "vote-result-total" },
  { key: "YES", label: "Votos a favor", icon: "✅", className: "vote-result-yes" },
  { key: "NO", label: "Votos en contra", icon: "❌", className: "vote-result-no" },
  { key: "ABSTAIN", label: "Abstenciones", icon: "⚪", className: "vote-result-abstain" },
] as const;

export default function MotionCard({ motion, meetingStatus, canVote = false, hasVoted = false, onVote }: MotionCardProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const { tally: liveTally, isConnected, isLoading, error } = useMotionTally(
    motion.status === "OPEN" ? motion.id : null
  );
  const tally = motion.status === "CLOSED" && motion.tally ? motion.tally : liveTally;

  const submitVote = async () => {
    if (!selectedChoice || !onVote) return;
    setSubmitting(true);
    setVoteError(null);
    try {
      await onVote(motion.id, selectedChoice);
    } catch (err: unknown) {
      setVoteError(err instanceof Error ? err.message : "No se pudo registrar el voto.");
    } finally {
      setSubmitting(false);
    }
  };

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
              {motion.status === "OPEN" ? "⚡ Abierta" : "🔒 Cerrada"}
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
            <div className="text-xs text-muted">segundos</div>
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
        {motion.status === "CLOSED" ? (
          <div className="closed-vote-summary" aria-label="Resultados finales de la votación">
            <div className="closed-vote-summary-heading">
              <strong>Resultados finales</strong>
              <span>Votación cerrada</span>
            </div>
            <div className="vote-results-grid">
              {CLOSED_RESULT_ITEMS.map((item) => (
                <div key={item.key} className={`vote-result-card ${item.className}`}>
                  <span className="vote-result-icon" aria-hidden="true">{item.icon}</span>
                  <strong className="vote-result-value">
                    {tally[item.key as keyof Tally] as number}
                  </strong>
                  <span className="vote-result-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <TallyChart tally={tally} isConnected={isConnected} isLoading={isLoading} isRealtime={motion.status === "OPEN"} />
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
            {opt === "YES" ? "✅" : opt === "NO" ? "❌" : "⚪"} {VOTE_LABELS[opt] ?? opt}
          </span>
        ))}
      </div>

      {onVote && (
        <div className="card card-p" style={{ background: "rgba(99,102,241,0.06)" }}>
          {hasVoted ? (
            <p className="text-sm text-success">✅ Tu voto fue registrado correctamente.</p>
          ) : motion.status !== "OPEN" ? (
            <p className="text-sm text-muted">Esta moción está cerrada y ya no acepta votos.</p>
          ) : (
            <>
              <p className="text-sm font-bold mb-3">Tu voto</p>
              <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                {motion.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`btn ${selectedChoice === option ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setSelectedChoice(option)}
                    disabled={!canVote || submitting}
                  >
                    {option === "YES" ? "✅" : option === "NO" ? "❌" : "⚪"} {VOTE_LABELS[option] ?? option}
                  </button>
                ))}
                <button type="button" className="btn btn-success" onClick={submitVote} disabled={!canVote || !selectedChoice || submitting}>
                  {submitting ? "Registrando..." : "Confirmar voto"}
                </button>
              </div>
              {voteError && <p className="form-error" role="alert" style={{ marginTop: "0.75rem" }}>⚠️ {voteError}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

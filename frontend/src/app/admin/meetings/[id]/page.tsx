"use client";
// =============================================================================
// Meeting Detail – /admin/meetings/[id]
// Shows all motions with live Realtime tally bars and admin controls
// =============================================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MotionCard from "@/components/MotionCard";
import { useAuth } from "@/lib/AuthContext";

interface Meeting {
  id: string;
  title: string;
  status: "DRAFT" | "LIVE" | "CLOSED";
  startTime?: string;
  transcriptSummary?: string;
}

interface Motion {
  id: string;
  title: string;
  description?: string;
  status: "OPEN" | "CLOSED";
  options: string[];
  durationSeconds?: number;
  openedAt?: string;
  orderIndex: number;
  tally?: { YES: number; NO: number; ABSTAIN: number; total: number };
}

const STATUS_META = {
  LIVE: { badge: "badge-live", label: "EN VIVO" },
  DRAFT: { badge: "badge-draft", label: "Borrador" },
  CLOSED: { badge: "badge-closed", label: "Finalizada" },
};

export default function MeetingDetailPage() {
  const params = useParams();
  const meetingId = params?.id as string;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const { getAuthHeaders, loading: authLoading } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [motions, setMotions] = useState<Motion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchMeetingData = () => {
    if (!meetingId || authLoading) return;
    const headers = getAuthHeaders();

    Promise.all([
      fetch(`${apiUrl}/api/v1/meetings/${meetingId}`, { headers }).then((r) => r.json()),
      fetch(`${apiUrl}/api/v1/meetings/${meetingId}/motions`, { headers }).then((r) => r.json()),
    ])
      .then(([mRes, motRes]) => {
        setMeeting(mRes.data ?? null);
        setMotions(motRes.data ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMeetingData();
  }, [meetingId, apiUrl, authLoading]);

  const handleUpdateMeetingStatus = async (newStatus: "LIVE" | "CLOSED") => {
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/meetings/${meetingId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Error al actualizar estado");
      }
      showToast(`✅ Asamblea ${newStatus === "LIVE" ? "iniciada en VIVO" : "cerrada"}`);
      fetchMeetingData();
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card card-p mb-6">
          <div className="skeleton skeleton-h1 mb-2" />
          <div className="skeleton skeleton-text" style={{ width: "30%" }} />
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="container">
        <div className="card card-p">
          <p className="text-danger">⚠️ {error ?? "Asamblea no encontrada"}</p>
          <a href="/admin/meetings" className="btn btn-secondary btn-sm mt-4">
            ← Volver a asambleas
          </a>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[meeting.status];

  return (
    <div className="container">
      {toast && (
        <div className="toast-wrap" role="status" aria-live="polite">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <a href="/admin">Dashboard</a>
        <span className="breadcrumb-sep">/</span>
        <a href="/admin/meetings">Asambleas</a>
        <span className="breadcrumb-sep">/</span>
        <span className="truncate">{meeting.title}</span>
      </div>

      {/* Meeting Header Card */}
      <div className="card card-p-lg mb-8" style={{ borderColor: meeting.status === "LIVE" ? "rgba(16,185,129,0.3)" : "var(--border)" }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`badge ${meta.badge}`}>
                {meeting.status === "LIVE" && <span className="live-dot" />}
                {meta.label}
              </span>
              <span className="text-xs font-mono text-muted">ID: {meeting.id}</span>
            </div>
            <h1 className="page-title" style={{ fontSize: "1.75rem" }}>
              {meeting.title}
            </h1>
            {meeting.startTime && (
              <p className="text-sm text-muted mt-1">
                🕐 Iniciada: {new Date(meeting.startTime).toLocaleString("es-ES")}
              </p>
            )}
          </div>

          {/* Meeting Controls */}
          <div className="flex gap-2 flex-wrap">
            {meeting.status === "DRAFT" && (
              <button
                className="btn btn-success"
                onClick={() => handleUpdateMeetingStatus("LIVE")}
                disabled={actionLoading}
              >
                ▶ Iniciar Asamblea (EN VIVO)
              </button>
            )}
            {meeting.status === "LIVE" && (
              <button
                className="btn btn-danger"
                onClick={() => handleUpdateMeetingStatus("CLOSED")}
                disabled={actionLoading}
              >
                ⏹ Finalizar Asamblea
              </button>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchMeetingData}
              title="Recargar datos"
            >
              🔄
            </button>
          </div>
        </div>

        {meeting.transcriptSummary && (
          <div className="mt-4 p-3 card" style={{ background: "rgba(0,0,0,0.2)" }}>
            <p className="text-xs text-muted mb-1 font-bold">RESUMEN / ACTA:</p>
            <p className="text-sm">{meeting.transcriptSummary}</p>
          </div>
        )}
      </div>

      {/* Motions Section */}
      <section aria-labelledby="motions-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="motions-heading" className="section-title" style={{ marginBottom: 0 }}>
            Mociones y Votaciones en Tiempo Real
            <span className="section-title-count">({motions.length})</span>
          </h2>
          <span className="badge badge-open">📡 Supabase Realtime Activo</span>
        </div>

        {motions.length === 0 ? (
          <div className="card empty">
            <div className="empty-icon">🗳️</div>
            <div className="empty-title">Sin mociones en esta asamblea</div>
            <p className="empty-text">No hay puntos registrados en el orden del día.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {motions.map((motion) => (
              <MotionCard
                key={motion.id}
                motion={motion}
                meetingStatus={meeting.status}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

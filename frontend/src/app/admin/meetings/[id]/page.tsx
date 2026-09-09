"use client";
// =============================================================================
// Meeting Detail – /admin/meetings/[id]
// Shows all motions with live Realtime tally bars and admin controls
// =============================================================================
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import MotionCard from "@/components/MotionCard";
import { useAuth } from "@/lib/AuthContext";
import { useTenant } from "@/lib/TenantContext";

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
  const { getAuthHeaders, user, loading: authLoading } = useAuth();
  const { activeOrg, loading: tenantLoading } = useTenant();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [motions, setMotions] = useState<Motion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [motionTitle, setMotionTitle] = useState("");
  const [motionDescription, setMotionDescription] = useState("");
  const [motionDuration, setMotionDuration] = useState(120);
  const [motionSaving, setMotionSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const isSuperadmin =
    user?.email?.toLowerCase() === "diegodanielalejomurillo@gmail.com" ||
    user?.user_metadata?.role === "SUPERADMIN";

  const fetchMeetingData = () => {
    if (!meetingId || authLoading || tenantLoading || !activeOrg?.id) return;
    const headers = getAuthHeaders();
    const orgParam = `?orgId=${encodeURIComponent(activeOrg.id)}`;

    Promise.all([
      fetch(`${apiUrl}/api/v1/meetings/${meetingId}${orgParam}`, { headers }).then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || `No se pudo cargar la asamblea (HTTP ${res.status})`);
        return body;
      }),
      fetch(`${apiUrl}/api/v1/meetings/${meetingId}/motions${orgParam}`, { headers }).then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || `No se pudieron cargar las mociones (HTTP ${res.status})`);
        return body;
      }),
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
  }, [meetingId, apiUrl, authLoading, tenantLoading, activeOrg?.id]);

  const handleUpdateMeetingStatus = async (newStatus: "LIVE" | "CLOSED") => {
    setActionLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/meetings/${meetingId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus, organizationId: activeOrg?.id }),
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

  const handleDeleteMeeting = async () => {
    if (!activeOrg?.id || !window.confirm(`¿Eliminar permanentemente la asamblea "${meeting?.title}" y todos sus votos?`)) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/meetings/${meetingId}?orgId=${encodeURIComponent(activeOrg.id)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "No se pudo eliminar la asamblea.");
      window.location.href = "/admin/meetings";
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "No se pudo eliminar la asamblea.");
      setActionLoading(false);
    }
  };

  const handleAddMotion = async () => {
    if (!activeOrg?.id || !motionTitle.trim()) return;
    setMotionSaving(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/motions`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          organizationId: activeOrg.id,
          title: motionTitle.trim(),
          description: motionDescription.trim() || undefined,
          options: ["YES", "NO", "ABSTAIN"],
          durationSeconds: motionDuration,
          orderIndex: motions.length,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "No se pudo crear la moción.");
      setMotionTitle("");
      setMotionDescription("");
      setMotionDuration(120);
      showToast("Moción agregada correctamente.");
      fetchMeetingData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "No se pudo crear la moción.");
    } finally {
      setMotionSaving(false);
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
            {isSuperadmin && (
              <button className="btn btn-danger btn-sm" onClick={handleDeleteMeeting} disabled={actionLoading}>
                Eliminar asamblea
              </button>
            )}
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
          <div className="card card-p-lg">
            <div className="empty-title">Sin mociones en esta asamblea</div>
            <p className="empty-text">Agrega el primer punto del orden del día para habilitar la votación.</p>
            <div className="form-section" style={{ maxWidth: 620, margin: "0 auto" }}>
              <div className="form-group">
                <label className="form-label" htmlFor="motion-title">Título de la moción</label>
                <input id="motion-title" className="form-input" value={motionTitle} onChange={(event) => setMotionTitle(event.target.value)} placeholder="Ej. Aprobación del presupuesto anual" />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="motion-description">Descripción</label>
                <textarea id="motion-description" className="form-textarea" rows={3} value={motionDescription} onChange={(event) => setMotionDescription(event.target.value)} placeholder="Detalles de lo que se somete a votación" />
              </div>
              <div className="form-group" style={{ maxWidth: 180 }}>
                <label className="form-label" htmlFor="motion-duration">Duración (segundos)</label>
                <input id="motion-duration" className="form-input" type="number" min={1} value={motionDuration} onChange={(event) => setMotionDuration(Math.max(1, Number(event.target.value) || 120))} />
              </div>
              <button className="btn btn-primary" onClick={handleAddMotion} disabled={motionSaving || !motionTitle.trim()}>
                {motionSaving ? "Guardando..." : "Agregar moción"}
              </button>
            </div>
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

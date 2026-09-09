"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useTenant } from "@/lib/TenantContext";

interface Meeting {
  id: string;
  title: string;
  status: "DRAFT" | "LIVE" | "CLOSED";
  startTime?: string;
  createdAt: string;
}

const STATUS = {
  LIVE: { badge: "badge-live", label: "EN VIVO" },
  DRAFT: { badge: "badge-draft", label: "Borrador" },
  CLOSED: { badge: "badge-closed", label: "Finalizada" },
};

const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("es-ES", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function MeetingsListPage() {
  const { getAuthHeaders, user, loading: authLoading } = useAuth();
  const { activeOrg, loading: tenantLoading } = useTenant();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "LIVE" | "DRAFT" | "CLOSED">("ALL");
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    if (authLoading || tenantLoading || !activeOrg?.id) return;

    fetch(`${api}/api/v1/meetings?orgId=${encodeURIComponent(activeOrg.id)}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((b) => setMeetings(b.data ?? []))
      .finally(() => setLoading(false));
  }, [api, authLoading, tenantLoading, activeOrg?.id]);

  const filtered = filter === "ALL" ? meetings : meetings.filter((m) => m.status === filter);
  const isSuperadmin =
    user?.email?.toLowerCase() === "diegodanielalejomurillo@gmail.com" ||
    user?.user_metadata?.role === "SUPERADMIN";

  const handleDeleteMeeting = async (meeting: Meeting) => {
    if (!activeOrg?.id || !window.confirm(`¿Eliminar permanentemente la asamblea "${meeting.title}" y todos sus votos?`)) return;
    const response = await fetch(`${api}/api/v1/meetings/${meeting.id}?orgId=${encodeURIComponent(activeOrg.id)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const body = await response.json();
    if (!response.ok) {
      window.alert(body.message || "No se pudo eliminar la asamblea.");
      return;
    }
    setMeetings((current) => current.filter((item) => item.id !== meeting.id));
  };

  return (
    <div className="container">
      <div className="breadcrumb">
        <a href="/admin">Dashboard</a>
        <span className="breadcrumb-sep">/</span>
        <span>Asambleas</span>
      </div>

      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Historial de Asambleas</h1>
          <p className="page-sub">Consulta, inicia o administra todas las sesiones de tu comunidad.</p>
        </div>
        <a href="/admin/meetings/new" className="btn btn-primary" id="btn-new-meeting-list">
          ＋ Nueva Asamblea
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["ALL", "LIVE", "DRAFT", "CLOSED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
            id={`filter-${f.toLowerCase()}`}
          >
            {f === "ALL" ? "Todas" : f === "LIVE" ? "🟢 En Vivo" : f === "DRAFT" ? "🔘 Borradores" : "✅ Finalizadas"}
            {!loading && (
              <span className="font-mono" style={{ marginLeft: "0.375rem", opacity: 0.7 }}>
                ({(f === "ALL" ? meetings : meetings.filter((m) => m.status === f)).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="meeting-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card card-p" style={{ height: 150 }}>
              <div className="skeleton" style={{ height: "100%", borderRadius: "var(--r-md)" }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">📅</div>
          <div className="empty-title">No hay asambleas {filter !== "ALL" ? "en este estado" : ""}</div>
          <p className="empty-text">Crea una nueva asamblea para iniciar una votación.</p>
          <a href="/admin/meetings/new" className="btn btn-primary">
            ＋ Crear Asamblea
          </a>
        </div>
      ) : (
        <div className="meeting-grid">
          {filtered.map((m) => {
            const meta = STATUS[m.status];
            return (
              <a key={m.id} href={`/admin/meetings/${m.id}`} className="card card-hover meeting-card">
                <div className="meeting-card-top">
                  <span className={`badge ${meta.badge}`}>
                    {m.status === "LIVE" && <span className="live-dot" />}
                    {meta.label}
                  </span>
                </div>
                <div className="meeting-card-title">{m.title}</div>
                <div className="meeting-card-meta">
                  <span>📅 Creada {fmt(m.createdAt)}</span>
                  {m.startTime && <span>🕐 Iniciada {fmt(m.startTime)}</span>}
                </div>
                <div className="meeting-card-footer">
                  <span className="font-mono text-xs text-muted">{m.id.slice(0, 8)}…</span>
                  <span className="text-xs text-accent">Entrar a Sala →</span>
                  {isSuperadmin && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleDeleteMeeting(m); }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

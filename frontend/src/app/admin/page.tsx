"use client";
import { useEffect, useState } from "react";
import ConnectionTest from "@/components/ConnectionTest";
import ActiveCondominiumBanner from "@/components/ActiveCondominiumBanner";
import { useAuth } from "@/lib/AuthContext";
import { useTenant } from "@/lib/TenantContext";
import { CalendarDays, CheckCircle2, Circle, CircleAlert, Settings, Users, Vote } from "lucide-react";

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

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const { getAuthHeaders, user, loading: authLoading } = useAuth();
  const { activeOrg } = useTenant();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  useEffect(() => {
    if (authLoading) return;
    const orgParam = activeOrg?.id ? `?orgId=${activeOrg.id}` : "";

    fetch(`${api}/api/v1/meetings${orgParam}`, {
      headers: getAuthHeaders(),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((b) => setMeetings(b.data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [api, authLoading, activeOrg?.id]);

  const live = meetings.filter((m) => m.status === "LIVE").length;
  const drafts = meetings.filter((m) => m.status === "DRAFT").length;
  const closed = meetings.filter((m) => m.status === "CLOSED").length;

  return (
    <div className="container">
      {/* Visual Active Condominium Banner */}
      <ActiveCondominiumBanner subtitle="Panel de Control Scoped: Asambleas y estadísticas de este condominio." />

      {/* Header */}
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Panel de Control</h1>
          <p className="page-sub">
            {user ? (
              <>
                Conectado como <strong className="text-accent">{user.email}</strong> · Gestión en tiempo real.
              </>
            ) : (
              "Gestiona asambleas, monitorea votos en vivo y verifica la conexión a Supabase."
            )}
          </p>
        </div>
        <div className="page-actions">
          <a href="/admin/meetings/new" className="btn btn-primary" id="btn-create-meeting-dash">
            ＋ Nueva Asamblea
          </a>
          <a href="/admin/vote" className="btn btn-success">
            <Vote size={16} /> Votar ahora
          </a>
          <a href="/admin/members" className="btn btn-secondary">
            <Users size={16} /> Miembros
          </a>
          <a href="/admin/settings" className="btn btn-secondary">
            <Settings size={16} /> Ajustes
          </a>
        </div>
      </div>

      {/* DB Connection Test */}
      <section aria-label="Database connection" className="mb-6">
        <ConnectionTest />
      </section>

      {/* Stats */}
      <section aria-label="Statistics" className="mb-8">
        <div className="stat-grid">
          <div className="card card-hover stat-card">
            <div className="stat-icon"><CalendarDays size={24} /></div>
            <div className="stat-value">{loading ? "—" : meetings.length}</div>
            <div className="stat-label">Total Asambleas</div>
          </div>
          <div className="card card-hover stat-card">
            <div className="stat-icon"><Circle size={24} /></div>
            <div className="stat-value" style={{ color: "var(--emerald)" }}>
              {loading ? "—" : live}
            </div>
            <div className="stat-label">En Vivo Ahora</div>
          </div>
          <div className="card card-hover stat-card">
            <div className="stat-icon"><Circle size={24} /></div>
            <div className="stat-value">{loading ? "—" : drafts}</div>
            <div className="stat-label">Borradores</div>
          </div>
          <div className="card card-hover stat-card">
            <div className="stat-icon"><CheckCircle2 size={24} /></div>
            <div className="stat-value">{loading ? "—" : closed}</div>
            <div className="stat-label">Finalizadas</div>
          </div>
        </div>
      </section>

      {/* Recent Meetings */}
      <section aria-label="Recent meetings">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">
            Asambleas Recientes
            {!loading && <span className="section-title-count">({meetings.length})</span>}
          </h2>
          <a href="/admin/meetings" className="btn btn-ghost btn-sm">
            Ver todas →
          </a>
        </div>

        {loading ? (
          <div className="meeting-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card card-p" style={{ height: 140 }}>
                <div className="skeleton skeleton-text" style={{ width: "70%", marginBottom: "0.75rem" }} />
                <div className="skeleton skeleton-text" style={{ width: "40%" }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card card-p">
            <p className="text-danger"><CircleAlert size={16} /> {error}</p>
            <p className="text-sm text-muted mt-2">
              Backend: <code>{api}</code>
            </p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="card empty">
            <div className="empty-icon">🗂️</div>
            <div className="empty-title">Aún no hay asambleas registradas en este condominio</div>
            <p className="empty-text">Crea tu primera asamblea con mociones para iniciar el proceso de votación.</p>
            <a href="/admin/meetings/new" className="btn btn-primary">
              ＋ Crear Asamblea
            </a>
          </div>
        ) : (
          <div className="meeting-grid">
            {meetings.slice(0, 6).map((m) => {
              const meta = STATUS[m.status];
              return (
                <a
                  key={m.id}
                  href={`/admin/meetings/${m.id}`}
                  className="card card-hover meeting-card"
                  aria-label={`${m.title} — ${meta.label}`}
                >
                  <div className="meeting-card-top">
                    <span className={`badge ${meta.badge}`}>
                      {m.status === "LIVE" && <span className="live-dot" />}
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted">{fmt(m.createdAt)}</span>
                  </div>
                  <div className="meeting-card-title">{m.title}</div>
                  <div className="meeting-card-footer">
                    <span className="text-xs text-muted">{m.startTime ? fmt(m.startTime) : "No iniciada"}</span>
                    <span className="text-xs text-accent">Entrar a Sala →</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

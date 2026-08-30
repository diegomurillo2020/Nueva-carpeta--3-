"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

interface Stats {
  totalOrganizations: number;
  totalUsers: number;
  totalMeetings: number;
  liveMeetings: number;
  totalVotes: number;
}

interface Organization {
  id: string;
  name: string;
  address?: string;
  settings: any;
  createdAt: string;
  _count: {
    users: number;
    properties: number;
    meetings: number;
  };
  users: Array<{ id: string; fullName: string; email?: string }>;
}

export default function SuperadminDashboardPage() {
  const { getAuthHeaders, loading: authLoading } = useAuth();
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const [stats, setStats] = useState<Stats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // New Organization Modal State
  const [showModal, setShowModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [creating, setCreating] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchGlobalData = () => {
    if (authLoading) return;
    const headers = getAuthHeaders();

    Promise.all([
      fetch(`${api}/api/v1/superadmin/stats`, { headers }).then((r) => r.json()),
      fetch(`${api}/api/v1/superadmin/organizations`, { headers }).then((r) => r.json()),
    ])
      .then(([statsRes, orgsRes]) => {
        if (statsRes.success) setStats(statsRes.data);
        if (orgsRes.success) setOrganizations(orgsRes.data ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGlobalData();
  }, [api, authLoading]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch(`${api}/api/v1/superadmin/organizations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: orgName.trim(),
          address: orgAddress.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Error al crear organización");

      showToast(`✅ Condominio "${json.data.name}" registrado exitosamente.`);
      setOrgName("");
      setOrgAddress("");
      setShowModal(false);
      fetchGlobalData();
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {toast && (
        <div className="toast-wrap" role="status" aria-live="polite">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}

      {/* Header */}
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Superadministración Global</h1>
          <p className="page-sub">
            Gestión global de condominios, roles RBAC y supervisión de votos en tiempo real sin límites de inquilino.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)} id="btn-create-org">
            ➕ Nuevo Condominio
          </button>
          <a href="/superadmin/roles" className="btn btn-secondary">
            🔑 Gestionar RBAC
          </a>
        </div>
      </div>

      {/* Global Stat Grid */}
      <section aria-label="System Metrics" className="mb-8">
        <div className="stat-grid">
          <div className="card card-hover stat-card" style={{ borderColor: "rgba(168,85,247,0.3)" }}>
            <div className="stat-icon">🏢</div>
            <div className="stat-value">{loading ? "—" : stats?.totalOrganizations ?? 0}</div>
            <div className="stat-label">Condominios Activos</div>
          </div>
          <div className="card card-hover stat-card" style={{ borderColor: "rgba(99,102,241,0.3)" }}>
            <div className="stat-icon">👥</div>
            <div className="stat-value">{loading ? "—" : stats?.totalUsers ?? 0}</div>
            <div className="stat-label">Usuarios Globales</div>
          </div>
          <div className="card card-hover stat-card" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
            <div className="stat-icon">🟢</div>
            <div className="stat-value" style={{ color: "var(--emerald)" }}>
              {loading ? "—" : stats?.liveMeetings ?? 0}
            </div>
            <div className="stat-label">Asambleas En Vivo</div>
          </div>
          <div className="card card-hover stat-card" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
            <div className="stat-icon">🗳️</div>
            <div className="stat-value" style={{ color: "var(--amber)" }}>
              {loading ? "—" : stats?.totalVotes ?? 0}
            </div>
            <div className="stat-label">Votos Registrados</div>
          </div>
        </div>
      </section>

      {/* Organizations Section */}
      <section aria-labelledby="orgs-heading" className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 id="orgs-heading" className="section-title" style={{ marginBottom: 0 }}>
            Condominios Registrados ({organizations.length})
          </h2>
          <a href="/superadmin/organizations" className="btn btn-ghost btn-sm">
            Ver tabla detallada →
          </a>
        </div>

        {loading ? (
          <div className="grid-2">
            {[1, 2].map((i) => (
              <div key={i} className="card card-p" style={{ height: 160 }}>
                <div className="skeleton skeleton-h1 mb-2" />
                <div className="skeleton skeleton-text" style={{ width: "60%" }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card card-p">
            <p className="text-danger">⚠️ {error}</p>
          </div>
        ) : organizations.length === 0 ? (
          <div className="card empty">
            <div className="empty-icon">🏢</div>
            <div className="empty-title">Sin condominios registrados</div>
            <p className="empty-text">Crea tu primer condominio para habilitar el acceso a los administradores locales.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              ➕ Crear Primer Condominio
            </button>
          </div>
        ) : (
          <div className="grid-2">
            {organizations.map((org) => (
              <div key={org.id} className="card card-hover card-p flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 style={{ fontSize: "1.15rem", fontWeight: 800 }}>{org.name}</h3>
                    <span className="badge badge-open">Inquilino Aislado</span>
                  </div>
                  {org.address && <p className="text-xs text-muted mb-3">📍 {org.address}</p>}

                  <div className="flex gap-4 text-xs font-mono text-muted mb-2">
                    <span>👥 {org._count.users} Usuarios</span>
                    <span>🏠 {org._count.properties} Unidades</span>
                    <span>📅 {org._count.meetings} Asambleas</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className="text-xs font-mono text-muted">ID: {org.id.slice(0, 8)}…</span>
                  <a href={`/admin?orgId=${org.id}`} className="btn btn-secondary btn-sm">
                    Acceder a Panel →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* New Organization Modal */}
      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">🏢 Registrar Nuevo Condominio</h2>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateOrg}>
              <div className="modal-body form-section">
                <div className="form-group">
                  <label htmlFor="modal-org-name" className="form-label form-label-required">
                    Nombre del Condominio / Asociación
                  </label>
                  <input
                    id="modal-org-name"
                    type="text"
                    className="form-input"
                    placeholder="ej. Residencial Las Palmeras II"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modal-org-address" className="form-label">
                    Dirección Física
                  </label>
                  <input
                    id="modal-org-address"
                    type="text"
                    className="form-input"
                    placeholder="ej. Calle Los Pinos #12, Distrito Nacional"
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                  />
                </div>
                <div className="card card-p" style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.2)" }}>
                  <p className="text-xs text-accent font-bold mb-1">🔒 Aislamiento Multi-Tenant Automático:</p>
                  <p className="text-xs text-muted">
                    Se creará un contexto de base de datos aislado con políticas RLS para garantizar que ningún otro condominio acceda a sus datos.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating} id="btn-submit-create-org">
                  {creating ? <span className="spin">⟳ Guardando…</span> : "Crear Condominio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

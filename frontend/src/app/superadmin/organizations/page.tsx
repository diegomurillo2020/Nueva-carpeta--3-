"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

interface Organization {
  id: string;
  name: string;
  address?: string;
  settings: any;
  createdAt: string;
  isActive: boolean;
  _count: {
    users: number;
    properties: number;
    meetings: number;
  };
}

export default function SuperadminOrganizationsPage() {
  const { getAuthHeaders, loading: authLoading } = useAuth();
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const updateOrganizationStatus = async (org: Organization) => {
    const action = org.isActive ? "dar de baja temporalmente" : "reactivar";
    if (!window.confirm(`¿Deseas ${action} el condominio "${org.name}"?`)) return;

    try {
      const response = await fetch(`${api}/api/v1/superadmin/organizations/${org.id}`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !org.isActive }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "No se pudo actualizar el estado.");
      showToast(org.isActive ? "Condominio dado de baja temporalmente." : "Condominio reactivado.");
      fetchOrgs();
    } catch (error: unknown) {
      showToast(`⚠️ ${error instanceof Error ? error.message : "No se pudo actualizar el condominio."}`);
    }
  };

  const deleteOrganization = async (org: Organization) => {
    const confirmation = window.prompt(
      `Esta acción eliminará permanentemente "${org.name}" y sus datos relacionados. Escribe ELIMINAR para continuar.`
    );
    if (confirmation !== "ELIMINAR") return;

    try {
      const response = await fetch(`${api}/api/v1/superadmin/organizations/${org.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "No se pudo eliminar el condominio.");
      showToast("Condominio eliminado permanentemente.");
      fetchOrgs();
    } catch (error: unknown) {
      showToast(`⚠️ ${error instanceof Error ? error.message : "No se pudo eliminar el condominio."}`);
    }
  };

  const fetchOrgs = () => {
    if (authLoading) return;
    fetch(`${api}/api/v1/superadmin/organizations`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((b) => setOrganizations(b.data ?? []))
      .catch((e) => showToast(`⚠️ Error al cargar condominios: ${e.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrgs();
  }, [api, authLoading]);

  const filtered = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.address && o.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      {toast && (
        <div className="toast-wrap" role="status" aria-live="polite">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}

      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Directorio de Condominios</h1>
          <p className="page-sub">Todos los inquilinos y asociaciones residenciales en el sistema.</p>
        </div>
        <a href="/superadmin" className="btn btn-primary">
          ➕ Registrar Condominio
        </a>
      </div>

      <div className="card card-p mb-6">
        <input
          type="search"
          className="form-input"
          placeholder="🔍 Buscar condominio por nombre o dirección…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="card card-p">
          <div className="skeleton skeleton-h1 mb-3" />
          <div className="skeleton skeleton-text" style={{ width: "80%" }} />
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Condominio</th>
                <th>Estado</th>
                <th>Dirección</th>
                <th>Usuarios</th>
                <th>Unidades</th>
                <th>Asambleas</th>
                <th>Fecha de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr key={org.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar" style={{ background: "linear-gradient(135deg, var(--purple), var(--accent))" }}>
                        🏢
                      </div>
                      <div>
                        <div className="td-name">{org.name}</div>
                        <div className="td-mono">{org.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${org.isActive ? "badge-success" : "badge-closed"}`}>
                      {org.isActive ? "Activo" : "Baja temporal"}
                    </span>
                  </td>
                  <td className="text-sm text-muted">{org.address || "—"}</td>
                  <td className="font-mono text-sm">{org._count.users}</td>
                  <td className="font-mono text-sm">{org._count.properties}</td>
                  <td className="font-mono text-sm">{org._count.meetings}</td>
                  <td className="td-mono">{new Date(org.createdAt).toLocaleDateString("es-ES")}</td>
                  <td>
                    <div className="flex gap-2">
                      {org.isActive && <a href={`/admin?orgId=${org.id}`} className="btn btn-secondary btn-sm">Entrar</a>}
                      <button className={`btn btn-sm ${org.isActive ? "btn-danger" : "btn-success"}`} onClick={() => updateOrganizationStatus(org)}>
                        {org.isActive ? "Dar de baja" : "Reactivar"}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteOrganization(org)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--text-3)" }}>
                    No se encontraron condominios que coincidan con &quot;{search}&quot;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

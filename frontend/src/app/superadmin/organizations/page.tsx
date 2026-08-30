"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

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
                  <td className="text-sm text-muted">{org.address || "—"}</td>
                  <td className="font-mono text-sm">{org._count.users}</td>
                  <td className="font-mono text-sm">{org._count.properties}</td>
                  <td className="font-mono text-sm">{org._count.meetings}</td>
                  <td className="td-mono">{new Date(org.createdAt).toLocaleDateString("es-ES")}</td>
                  <td>
                    <div className="flex gap-2">
                      <a href={`/admin?orgId=${org.id}`} className="btn btn-secondary btn-sm">
                        Entrar
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-3)" }}>
                    No se encontraron condominios que coincidan con "{search}"
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

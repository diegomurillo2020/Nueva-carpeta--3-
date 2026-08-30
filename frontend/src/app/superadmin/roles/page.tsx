"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

interface Permission {
  id: string;
  action: string;
  resource: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Array<{ permission: Permission }>;
  _count: { users: number };
}

export default function SuperadminRolesPage() {
  const { getAuthHeaders, loading: authLoading } = useAuth();
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRbacData = () => {
    if (authLoading) return;
    const headers = getAuthHeaders();

    Promise.all([
      fetch(`${api}/api/v1/superadmin/roles`, { headers }).then((r) => r.json()),
      fetch(`${api}/api/v1/superadmin/permissions`, { headers }).then((r) => r.json()),
    ])
      .then(([rolesRes, permsRes]) => {
        if (rolesRes.success) setRoles(rolesRes.data ?? []);
        if (permsRes.success) setPermissions(permsRes.data ?? []);
      })
      .catch((err) => showToast(`⚠️ Error RBAC: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRbacData();
  }, [api, authLoading]);

  // Group permissions by resource
  const resources = Array.from(new Set(permissions.map((p) => p.resource)));

  return (
    <div>
      {toast && (
        <div className="toast-wrap" role="status" aria-live="polite">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}

      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Matriz de Roles & Permisos (RBAC)</h1>
          <p className="page-sub">
            Control de acceso granular por rol y recurso para garantizar la integridad y aislamiento del sistema.
          </p>
        </div>
        <span className="badge badge-open">🔒 Motor RBAC Dinámico</span>
      </div>

      {/* Roles Overview Cards */}
      <div className="grid-4 mb-8">
        {roles.map((r) => (
          <div key={r.id} className="card card-p">
            <div className="flex items-center justify-between mb-2">
              <span className={`badge ${r.name === "SUPERADMIN" ? "badge-warn" : r.name === "ORG_ADMIN" ? "badge-open" : "badge-draft"}`}>
                {r.name}
              </span>
              <span className="text-xs font-mono text-muted">{r._count.users} Usuarios</span>
            </div>
            <p className="text-xs text-muted mt-2">{r.description || "Sin descripción"}</p>
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <span className="text-xs font-mono text-accent">
                {r.permissions.length} Permisos Asignados
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Permissions Matrix Table */}
      <div className="card card-p-lg">
        <h2 className="section-title">📋 Matriz de Acceso por Recursos</h2>

        {loading ? (
          <div className="skeleton skeleton-h1" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Recurso / Entidad</th>
                  <th>Acción</th>
                  {roles.map((r) => (
                    <th key={r.id} style={{ textAlign: "center" }}>
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="badge badge-draft font-mono">{p.resource}</span>
                    </td>
                    <td>
                      <span className="font-mono text-xs font-bold">{p.action}</span>
                    </td>
                    {roles.map((r) => {
                      const hasPerm =
                        r.name === "SUPERADMIN" ||
                        r.permissions.some((rp) => rp.permission?.id === p.id);

                      return (
                        <td key={r.id} style={{ textAlign: "center" }}>
                          {hasPerm ? (
                            <span style={{ color: "var(--emerald)", fontSize: "1.1rem" }}>✔</span>
                          ) : (
                            <span style={{ color: "var(--text-4)", fontSize: "1.1rem" }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

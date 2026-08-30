"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

interface Role {
  id: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
}

interface UserRecord {
  id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  dniPassport?: string;
  isActive: boolean;
  role: Role;
  organization?: Organization | null;
  createdAt: string;
}

export default function SuperadminUsersPage() {
  const { getAuthHeaders, loading: authLoading } = useAuth();
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsersData = () => {
    if (authLoading) return;
    const headers = getAuthHeaders();

    Promise.all([
      fetch(`${api}/api/v1/superadmin/users`, { headers }).then((r) => r.json()),
      fetch(`${api}/api/v1/superadmin/roles`, { headers }).then((r) => r.json()),
      fetch(`${api}/api/v1/superadmin/organizations`, { headers }).then((r) => r.json()),
    ])
      .then(([usersRes, rolesRes, orgsRes]) => {
        if (usersRes.success) setUsers(usersRes.data ?? []);
        if (rolesRes.success) setRoles(rolesRes.data ?? []);
        if (orgsRes.success) setOrganizations(orgsRes.data ?? []);
      })
      .catch((e) => showToast(`⚠️ Error al cargar usuarios: ${e.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsersData();
  }, [api, authLoading]);

  const handleUpdateUserRole = async (userId: string, newRoleId: string) => {
    try {
      const res = await fetch(`${api}/api/v1/superadmin/users/${userId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ roleId: newRoleId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Error al actualizar rol");
      showToast("✅ Rol de usuario actualizado.");
      fetchUsersData();
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`);
    }
  };

  const handleUpdateUserOrg = async (userId: string, newOrgId: string) => {
    try {
      const res = await fetch(`${api}/api/v1/superadmin/users/${userId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ organizationId: newOrgId || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Error al reasignar condominio");
      showToast("✅ Condominio reasignado.");
      fetchUsersData();
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      (u.dniPassport && u.dniPassport.includes(search))
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
          <h1 className="page-title">Directorio Global de Usuarios</h1>
          <p className="page-sub">
            Administra los roles globales y la asignación de inquilinos de todos los usuarios del sistema.
          </p>
        </div>
        <span className="badge badge-open font-mono">{users.length} Usuarios Totales</span>
      </div>

      <div className="card card-p mb-6">
        <input
          type="search"
          className="form-input"
          placeholder="🔍 Buscar por nombre, correo electrónico o DNI…"
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
                <th>Usuario</th>
                <th>Condominio / Inquilino</th>
                <th>Rol Asignado</th>
                <th>DNI / Pasaporte</th>
                <th>Teléfono</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar">{u.fullName.charAt(0).toUpperCase()}</div>
                      <div>
                        <div className="td-name">{u.fullName}</div>
                        <div className="td-mono">{u.email || "Sin correo"}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.5rem", width: "auto" }}
                      value={u.organization?.id || ""}
                      onChange={(e) => handleUpdateUserOrg(u.id, e.target.value)}
                    >
                      <option value="">(Global / Sin Condominio)</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          🏢 {org.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="form-select"
                      style={{
                        fontSize: "0.8rem",
                        padding: "0.3rem 0.5rem",
                        width: "auto",
                        color: u.role.name === "SUPERADMIN" ? "var(--amber)" : "var(--text)",
                      }}
                      value={u.role.id}
                      onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name === "SUPERADMIN" ? "👑 SUPERADMIN" : r.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="td-mono">{u.dniPassport || "—"}</td>
                  <td className="td-mono">{u.phoneNumber || "—"}</td>
                  <td>
                    <span className={`badge ${u.isActive ? "badge-success" : "badge-closed"}`}>
                      {u.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text-3)" }}>
                    No se encontraron usuarios que coincidan con &quot;{search}&quot;
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

"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

interface Role { id: string; name: string; }
interface Organization { id: string; name: string; }
interface UserRecord {
  id: string;
  fullName: string;
  email?: string | null;
  phoneNumber?: string | null;
  dniPassport?: string | null;
  isActive: boolean;
  role: Role;
  organization?: Organization | null;
  createdAt: string;
}

interface UserForm {
  fullName: string;
  email: string;
  dniPassport: string;
  phoneNumber: string;
  roleId: string;
  organizationId: string;
  isActive: boolean;
}

const EMPTY_FORM: UserForm = {
  fullName: "", email: "", dniPassport: "", phoneNumber: "", roleId: "", organizationId: "", isActive: true,
};

export default function SuperadminUsersPage() {
  const { getAuthHeaders, loading: authLoading } = useAuth();
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);

  const showToast = (message: string) => {
    setToast(message);
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
      .catch((error) => showToast(`⚠️ Error al cargar usuarios: ${error.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsersData(); }, [api, authLoading]);

  const openCreate = () => {
    setEditingUser(null);
    setShowForm(true);
    setForm({ ...EMPTY_FORM, roleId: roles.find((role) => role.name === "MEMBER")?.id || roles[0]?.id || "" });
    setFormError(null);
  };

  const openEdit = (user: UserRecord) => {
    setEditingUser(user);
    setShowForm(true);
    setForm({
      fullName: user.fullName,
      email: user.email || "",
      dniPassport: user.dniPassport || "",
      phoneNumber: user.phoneNumber || "",
      roleId: user.role.id,
      organizationId: user.organization?.id || "",
      isActive: user.isActive,
    });
    setFormError(null);
  };

  const closeForm = () => { setEditingUser(null); setShowForm(false); setFormError(null); };
  const updateField = <K extends keyof UserForm>(field: K, value: UserForm[K]) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.roleId) {
      setFormError("El nombre completo y el rol son obligatorios.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        dniPassport: form.dniPassport.trim(),
        phoneNumber: form.phoneNumber.trim(),
        roleId: form.roleId,
        organizationId: form.organizationId || null,
        isActive: form.isActive,
      };
      const response = await fetch(`${api}/api/v1/superadmin/users${editingUser ? `/${editingUser.id}` : ""}`, {
        method: editingUser ? "PATCH" : "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "No se pudo guardar el usuario.");
      showToast(editingUser ? "✅ Usuario actualizado." : "✅ Usuario creado.");
      closeForm();
      fetchUsersData();
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar el usuario.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (user: UserRecord) => {
    if (!window.confirm(`¿Eliminar definitivamente a ${user.fullName}? Esta acción no se puede deshacer.`)) return;
    try {
      const response = await fetch(`${api}/api/v1/superadmin/users/${user.id}`, { method: "DELETE", headers: getAuthHeaders() });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "No se pudo eliminar el usuario.");
      showToast("✅ Usuario eliminado.");
      fetchUsersData();
    } catch (error: unknown) { showToast(`⚠️ ${error instanceof Error ? error.message : "Error al eliminar."}`); }
  };

  const filtered = users.filter((user) => {
    const term = search.toLowerCase();
    return user.fullName.toLowerCase().includes(term) || (user.email || "").toLowerCase().includes(term) || (user.dniPassport || "").toLowerCase().includes(term);
  });

  return (
    <div>
      {toast && <div className="toast-wrap" role="status" aria-live="polite"><div className="toast toast-success">{toast}</div></div>}
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Directorio Global de Usuarios</h1>
          <p className="page-sub">Crea, modifica, activa, desactiva y elimina usuarios de cualquier condominio.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="badge badge-open font-mono">{users.length} Usuarios</span>
          <button className="btn btn-primary" onClick={openCreate}>＋ Nuevo usuario</button>
        </div>
      </div>

      <div className="card card-p mb-6"><input type="search" className="form-input" placeholder="🔍 Buscar por nombre, correo o DNI…" value={search} onChange={(event) => setSearch(event.target.value)} /></div>

      {loading ? <div className="card card-p"><div className="skeleton skeleton-h1 mb-3" /><div className="skeleton skeleton-text" style={{ width: "80%" }} /></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Usuario</th><th>Condominio</th><th>Rol</th><th>Documento</th><th>Teléfono</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td><div className="flex items-center gap-3"><div className="avatar">{user.fullName.charAt(0).toUpperCase()}</div><div><div className="td-name">{user.fullName}</div><div className="td-mono">{user.email || "Sin correo"}</div></div></div></td>
                  <td>{user.organization?.name || <span className="text-muted">Global</span>}</td>
                  <td><span className={`badge ${user.role.name === "SUPERADMIN" ? "badge-warn" : "badge-open"}`}>{user.role.name}</span></td>
                  <td className="td-mono">{user.dniPassport || "—"}</td>
                  <td className="td-mono">{user.phoneNumber || "—"}</td>
                  <td><span className={`badge ${user.isActive ? "badge-success" : "badge-closed"}`}>{user.isActive ? "Activo" : "Inactivo"}</span></td>
                  <td><div className="flex gap-2"><button className="btn btn-secondary btn-sm" onClick={() => openEdit(user)}>✏️ Editar</button><button className="btn btn-danger btn-sm" onClick={() => handleDelete(user)}>🗑️</button></div></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-3)" }}>No se encontraron usuarios.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
          <form className="modal card card-p-lg" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between mb-6"><h2 id="user-modal-title" className="section-title" style={{ marginBottom: 0 }}>{editingUser ? "Editar usuario" : "Nuevo usuario"}</h2><button type="button" className="btn btn-ghost btn-icon" onClick={closeForm} aria-label="Cerrar">✕</button></div>
            <div className="form-section">
              <div className="form-group"><label className="form-label" htmlFor="user-full-name">Nombre completo</label><input id="user-full-name" className="form-input" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} required /></div>
              <div className="form-row"><div className="form-group"><label className="form-label" htmlFor="user-email">Correo electrónico</label><input id="user-email" type="email" className="form-input" value={form.email} onChange={(event) => updateField("email", event.target.value)} /></div><div className="form-group"><label className="form-label" htmlFor="user-phone">Teléfono</label><input id="user-phone" className="form-input" value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} /></div></div>
              <div className="form-row"><div className="form-group"><label className="form-label" htmlFor="user-dni">DNI / Pasaporte</label><input id="user-dni" className="form-input" value={form.dniPassport} onChange={(event) => updateField("dniPassport", event.target.value)} /></div><div className="form-group"><label className="form-label" htmlFor="user-role">Rol</label><select id="user-role" className="form-select" value={form.roleId} onChange={(event) => updateField("roleId", event.target.value)} required>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></div></div>
              <div className="form-group"><label className="form-label" htmlFor="user-organization">Condominio</label><select id="user-organization" className="form-select" value={form.organizationId} onChange={(event) => updateField("organizationId", event.target.value)}><option value="">Global / Sin condominio</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(event) => updateField("isActive", event.target.checked)} /> Usuario activo y habilitado para votar</label>
              {formError && <p className="form-error" role="alert">⚠️ {formError}</p>}
            </div>
            <div className="form-actions mt-6"><button type="button" className="btn btn-secondary" onClick={closeForm}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar usuario"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

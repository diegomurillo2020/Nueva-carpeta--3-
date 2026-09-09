"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useTenant } from "@/lib/TenantContext";
import ActiveCondominiumBanner from "@/components/ActiveCondominiumBanner";

interface Property {
  id: string;
  unitIdentifier: string;
  coefficientShare: number;
}

interface Member {
  id: string;
  fullName: string;
  email?: string;
  dniPassport?: string;
  phoneNumber?: string;
  role: { id: string; name: string };
  isActive: boolean;
  properties?: Property[];
  createdAt: string;
}

interface CreatedCredentials {
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  fullName: string;
}

export default function MembersPage() {
  const { getAuthHeaders, loading: authLoading } = useAuth();
  const { activeOrg } = useTenant();
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"list" | "create">("list");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // New Member Form State
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    dniPassport: "",
    phoneNumber: "",
    role: "MEMBER",
    unitIdentifier: "",
    coefficientShare: "",
    temporaryPassword: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<CreatedCredentials | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMembers = () => {
    if (authLoading) return;
    const orgParam = activeOrg?.id ? `?orgId=${activeOrg.id}` : "";

    fetch(`${api}/api/v1/members${orgParam}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((b) => setMembers(b.data ?? []))
      .catch((e) => showToast(`⚠️ Error al cargar miembros: ${e.message}`, "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, [api, authLoading, activeOrg?.id]);

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) {
      showToast("El nombre completo y el correo electrónico son obligatorios.", "error");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${api}/api/v1/members`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.toLowerCase().trim(),
          dniPassport: form.dniPassport.trim() || undefined,
          phoneNumber: form.phoneNumber.trim() || undefined,
          role: form.role,
          temporaryPassword: form.temporaryPassword.trim() || undefined,
          unitIdentifier: form.unitIdentifier.trim() || undefined,
          coefficientShare: form.coefficientShare ? parseFloat(form.coefficientShare) : undefined,
          organizationId: activeOrg?.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Error al registrar miembro.");

      showToast(`✅ Miembro "${form.fullName}" registrado exitosamente.`);

      // Open Credentials Modal
      setCreatedCreds({
        email: json.credentials.email,
        temporaryPassword: json.credentials.temporaryPassword,
        loginUrl: json.credentials.loginUrl,
        fullName: form.fullName,
      });

      // Reset form
      setForm({
        fullName: "",
        email: "",
        dniPassport: "",
        phoneNumber: "",
        role: "MEMBER",
        unitIdentifier: "",
        coefficientShare: "",
        temporaryPassword: "",
      });

      fetchMembers();
      setTab("list");
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (member: Member) => {
    if (!confirm(`¿Deseas regenerar la contraseña temporal para "${member.fullName}"?`)) return;

    try {
      const res = await fetch(`${api}/api/v1/members/${member.id}/reset-password`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ organizationId: activeOrg?.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Error al resetear contraseña.");

      setCreatedCreds({
        email: json.credentials.email,
        temporaryPassword: json.credentials.temporaryPassword,
        loginUrl: `${window.location.origin}/login`,
        fullName: member.fullName,
      });
      showToast(`✅ Nueva contraseña generada para ${member.fullName}.`);
    } catch (err: any) {
      showToast(`⚠️ ${err.message}`, "error");
    }
  };

  const copyWhatsAppMessage = () => {
    if (!createdCreds) return;
    const orgName = activeOrg?.name || "el Condominio";
    const text = `👋 Hola ${createdCreds.fullName},\n\nSe ha creado tu cuenta oficial de votación para *${orgName}* en ConvoAssemble.\n\n🔗 *Enlace de Acceso:* ${createdCreds.loginUrl}\n📧 *Usuario:* ${createdCreds.email}\n🔑 *Contraseña Temporal:* ${createdCreds.temporaryPassword}\n\n_Podrás cambiar tu contraseña una vez que inicies sesión en la plataforma._`;

    navigator.clipboard.writeText(text);
    showToast("📋 Mensaje para WhatsApp copiado al portapapeles.");
  };

  const filtered = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (m.email && m.email.toLowerCase().includes(search.toLowerCase())) ||
      (m.dniPassport && m.dniPassport.includes(search)) ||
      (m.properties && m.properties.some((p) => p.unitIdentifier.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="container">
      {toast && (
        <div className="toast-wrap" role="status" aria-live="polite">
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        </div>
      )}

      <div className="breadcrumb">
        <a href="/admin">Dashboard</a>
        <span className="breadcrumb-sep">/</span>
        <span>Miembros</span>
      </div>

      {/* Active Condominium Banner */}
      <ActiveCondominiumBanner subtitle="Directorio de miembros, residentes y apoderados asignados a este condominio." />

      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Directorio de Miembros</h1>
          <p className="page-sub">
            Registra propietarios y residentes con acceso instantáneo a la plataforma y canales de votación.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setTab(tab === "create" ? "list" : "create")}
          id="btn-toggle-member-form"
        >
          {tab === "create" ? "📋 Ver Lista de Miembros" : "➕ Registrar Nuevo Miembro"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          className={`btn btn-sm ${tab === "list" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("list")}
        >
          👥 Miembros Registrados ({members.length})
        </button>
        <button
          className={`btn btn-sm ${tab === "create" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("create")}
        >
          ➕ Formulario de Registro Rápido
        </button>
      </div>

      {/* Member Registration Form */}
      {tab === "create" && (
        <div className="card card-p-lg mb-8" style={{ maxWidth: 760, borderColor: "rgba(99,102,241,0.3)" }}>
          <div className="flex items-center gap-3 mb-4">
            <span style={{ fontSize: "1.75rem" }}>👤</span>
            <div>
              <h2 className="section-title" style={{ marginBottom: "0.15rem" }}>
                Registrar Miembro con Acceso Inmediato
              </h2>
              <p className="text-xs text-muted">
                Se creará automáticamente la cuenta de acceso con una contraseña temporal para que puedas enviársela.
              </p>
            </div>
          </div>

          <form onSubmit={handleRegisterMember}>
            <div className="form-section">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reg-name" className="form-label form-label-required">
                    Nombre Completo
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    className="form-input"
                    placeholder="ej. Carlos Rodríguez"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-email" className="form-label form-label-required">
                    Correo Electrónico (Usuario de Acceso)
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    className="form-input"
                    placeholder="carlos@ejemplo.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reg-phone" className="form-label">
                    Teléfono / WhatsApp <span className="form-hint">(para votación vía chat)</span>
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    className="form-input"
                    placeholder="+1-809-555-0100"
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-dni" className="form-label">
                    DNI / Pasaporte / Cédula
                  </label>
                  <input
                    id="reg-dni"
                    type="text"
                    className="form-input"
                    placeholder="001-1234567-8"
                    value={form.dniPassport}
                    onChange={(e) => setForm({ ...form, dniPassport: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reg-unit" className="form-label">
                    Unidad / Apartamento / Casa
                  </label>
                  <input
                    id="reg-unit"
                    type="text"
                    className="form-input"
                    placeholder="ej. Torre A - Apto 302"
                    value={form.unitIdentifier}
                    onChange={(e) => setForm({ ...form, unitIdentifier: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-coef" className="form-label">
                    Alícuota / Coeficiente (%) <span className="form-hint">(para quórum ponderado)</span>
                  </label>
                  <input
                    id="reg-coef"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="form-input"
                    placeholder="ej. 3.45"
                    value={form.coefficientShare}
                    onChange={(e) => setForm({ ...form, coefficientShare: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reg-role" className="form-label">
                    Rol en el Condominio
                  </label>
                  <select
                    id="reg-role"
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="MEMBER">Miembro Propietario / Residente (Votante)</option>
                    <option value="SECRETARY">Secretario de Asamblea</option>
                    <option value="ORG_ADMIN">Administrador de Condominio</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="reg-pass" className="form-label">
                    Contraseña Temporal <span className="form-hint">(opcional - se auto-genera)</span>
                  </label>
                  <input
                    id="reg-pass"
                    type="text"
                    className="form-input"
                    placeholder="ej. ConvoPass2026!"
                    value={form.temporaryPassword}
                    onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-actions mt-4">
                <button type="button" className="btn btn-secondary" onClick={() => setTab("list")}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting} id="btn-submit-member">
                  {submitting ? (
                    <>
                      <span className="spin">⟳</span> Creando Cuenta…
                    </>
                  ) : (
                    "🚀 Registrar y Generar Credenciales"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Members Table */}
      {tab === "list" && (
        <div>
          <div className="card card-p mb-4">
            <input
              type="search"
              className="form-input"
              placeholder="🔍 Buscar por nombre, correo, apartamento o DNI…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar miembros"
            />
          </div>

          {loading ? (
            <div className="card card-p">
              <div className="skeleton skeleton-h1 mb-3" />
              <div className="skeleton skeleton-text" style={{ width: "70%" }} />
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Miembro</th>
                    <th>Unidad / Alícuota</th>
                    <th>DNI / Cédula</th>
                    <th>Teléfono (WhatsApp)</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Credenciales</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar">{(m.fullName || "M").charAt(0).toUpperCase()}</div>
                          <div>
                            <div className="td-name">{m.fullName}</div>
                            <div className="td-mono">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {m.properties && m.properties.length > 0 ? (
                          m.properties.map((p) => (
                            <div key={p.id}>
                              <span className="badge badge-open" style={{ fontSize: "0.7rem" }}>
                                🏠 {p.unitIdentifier}
                              </span>
                              <span className="text-xs text-muted font-mono ml-1">
                                ({(Number(p.coefficientShare) * 100).toFixed(2)}%)
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-muted">Sin unidad</span>
                        )}
                      </td>
                      <td className="td-mono">{m.dniPassport || "—"}</td>
                      <td className="td-mono">{m.phoneNumber || "—"}</td>
                      <td>
                        <span
                          className={`badge ${
                            m.role?.name === "ORG_ADMIN"
                              ? "badge-warn"
                              : m.role?.name === "SECRETARY"
                              ? "badge-open"
                              : "badge-draft"
                          }`}
                        >
                          {m.role?.name || "MEMBER"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${m.isActive ? "badge-success" : "badge-closed"}`}>
                          {m.isActive ? "✅ Activo" : "❌ Inactivo"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm text-xs"
                          onClick={() => handleResetPassword(m)}
                          title="Generar nueva contraseña temporal para este miembro"
                        >
                          🔑 Reset Clave
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-3)" }}>
                        No se encontraron miembros registrados en este condominio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Generated Credentials Modal */}
      {createdCreds && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal" style={{ maxWidth: 520, borderColor: "rgba(16,185,129,0.4)" }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "1.5rem" }}>🎉</span>
                <h2 className="modal-title">¡Cuenta Creada Exitosamente!</h2>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setCreatedCreds(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body form-section">
              <p className="text-sm text-muted">
                La cuenta de <strong>{createdCreds.fullName}</strong> ya está activa en Supabase Auth. Puedes entregarle las siguientes credenciales para que ingrese y configure su contraseña personal:
              </p>

              <div
                className="card card-p"
                style={{ background: "rgba(0,0,0,0.4)", borderColor: "rgba(99,102,241,0.3)" }}
              >
                <div className="form-group mb-2">
                  <span className="text-xs text-muted font-bold">CORREO / USUARIO:</span>
                  <p className="font-mono text-sm" style={{ color: "var(--accent-3)" }}>
                    {createdCreds.email}
                  </p>
                </div>
                <div className="form-group mb-2">
                  <span className="text-xs text-muted font-bold">CONTRASEÑA TEMPORAL:</span>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-lg font-bold" style={{ color: "var(--emerald)" }}>
                      {createdCreds.temporaryPassword}
                    </p>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCreds.temporaryPassword);
                        showToast("Contraseña copiada");
                      }}
                    >
                      Copiar Clave
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <span className="text-xs text-muted font-bold">ENLACE DE ACCESO:</span>
                  <p className="font-mono text-xs text-muted">{createdCreds.loginUrl}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button className="btn btn-primary btn-full" onClick={copyWhatsAppMessage}>
                  📱 Copiar Mensaje para WhatsApp
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCreatedCreds(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

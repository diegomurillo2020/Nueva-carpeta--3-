"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import ActiveCondominiumBanner from "@/components/ActiveCondominiumBanner";

type Section = "general" | "security" | "quorum" | "channels" | "notifications" | "danger";

export default function SettingsPage() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("general");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // General state
  const [general, setGeneral] = useState({
    orgName: "Condominio Torre Bella Vista",
    timezone: "America/Santo_Domingo",
    language: "es",
  });

  // Security / Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  // Quorum & Channels
  const [quorum, setQuorum] = useState({ rule: "COEFFICIENT", threshold: "51", fallback: "HEADCOUNT" });
  const [channels, setChannels] = useState({ whatsappEnabled: true, telegramEnabled: false, webEnabled: true });
  const [notifs, setNotifs] = useState({ emailOnVoteOpen: true, emailOnClose: true, whatsappReminder: false });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const save = async (label: string) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    showToast(`✅ ${label} guardado exitosamente.`);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast("La nueva contraseña debe tener al menos 6 caracteres.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Las contraseñas no coinciden.", "error");
      return;
    }

    setChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      showToast("✅ Tu contraseña ha sido actualizada con éxito.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      showToast(`⚠️ ${err.message || "Error al actualizar contraseña"}`, "error");
    } finally {
      setChangingPass(false);
    }
  };

  const NAV: { key: Section; icon: string; label: string }[] = [
    { key: "general", icon: "🏢", label: "Condominio" },
    { key: "security", icon: "🔑", label: "Mi Contraseña" },
    { key: "quorum", icon: "📊", label: "Reglas de Quórum" },
    { key: "channels", icon: "📱", label: "Canales de Votación" },
    { key: "notifications", icon: "🔔", label: "Notificaciones" },
    { key: "danger", icon: "⚠️", label: "Zona de Peligro" },
  ];

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
        <span>Ajustes</span>
      </div>

      <ActiveCondominiumBanner subtitle="Configuración de parámetros, canales de voto y seguridad personal." />

      <div className="page-header">
        <h1 className="page-title">Ajustes & Seguridad</h1>
        <p className="page-sub">Personaliza los parámetros del condominio y gestiona tu contraseña de acceso.</p>
      </div>

      <div className="dash-layout">
        {/* Sidebar */}
        <aside className="sidebar" aria-label="Settings navigation">
          <nav className="sidebar-nav">
            {NAV.map((n) => (
              <button
                key={n.key}
                id={`settings-nav-${n.key}`}
                className={`sidebar-item ${section === n.key ? "active" : ""}`}
                onClick={() => setSection(n.key)}
                style={{ border: "none", width: "100%", textAlign: "left", background: "transparent", cursor: "pointer" }}
              >
                <span className="sidebar-icon">{n.icon}</span>
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Panel */}
        <div>
          {/* General */}
          {section === "general" && (
            <div className="card card-p-lg">
              <h2 className="section-title">🏢 Datos del Condominio</h2>
              <div className="form-section">
                <div className="form-group">
                  <label htmlFor="org-name" className="form-label form-label-required">
                    Nombre del Condominio / Asociación
                  </label>
                  <input
                    id="org-name"
                    type="text"
                    className="form-input"
                    value={general.orgName}
                    onChange={(e) => setGeneral((g) => ({ ...g, orgName: e.target.value }))}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="timezone" className="form-label">
                      Zona Horaria
                    </label>
                    <select
                      id="timezone"
                      className="form-select"
                      value={general.timezone}
                      onChange={(e) => setGeneral((g) => ({ ...g, timezone: e.target.value }))}
                    >
                      <option value="America/Santo_Domingo">America/Santo_Domingo (UTC-4)</option>
                      <option value="America/New_York">America/New_York (UTC-5)</option>
                      <option value="America/Bogota">America/Bogota (UTC-5)</option>
                      <option value="America/Lima">America/Lima (UTC-5)</option>
                      <option value="Europe/Madrid">Europe/Madrid (UTC+1)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="language" className="form-label">
                      Idioma
                    </label>
                    <select
                      id="language"
                      className="form-select"
                      value={general.language}
                      onChange={(e) => setGeneral((g) => ({ ...g, language: e.target.value }))}
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                      <option value="pt">Português</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={() => save("Datos del condominio")} disabled={saving}>
                    {saving ? <span className="spin">⟳ Guardando…</span> : "💾 Guardar Cambios"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security / Password */}
          {section === "security" && (
            <div className="card card-p-lg">
              <div className="flex items-center gap-2 mb-2">
                <span style={{ fontSize: "1.5rem" }}>🔐</span>
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  Cambiar mi Contraseña
                </h2>
              </div>
              <p className="text-sm text-muted mb-6">
                Si ingresaste con una contraseña temporal creada por el administrador, cámbiala aquí por una clave personal segura.
              </p>

              <form onSubmit={handleUpdatePassword}>
                <div className="form-section" style={{ maxWidth: 460 }}>
                  <div className="form-group">
                    <span className="text-xs text-muted font-bold">CUENTA ACTUAL:</span>
                    <p className="font-mono text-sm text-accent">{user?.email || "usuario@convoassemble.com"}</p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="new-pass" className="form-label form-label-required">
                      Nueva Contraseña
                    </label>
                    <input
                      id="new-pass"
                      type="password"
                      className="form-input"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirm-pass" className="form-label form-label-required">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      id="confirm-pass"
                      type="password"
                      className="form-input"
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="form-actions mt-4">
                    <button type="submit" className="btn btn-primary" disabled={changingPass} id="btn-update-password">
                      {changingPass ? <span className="spin">⟳ Actualizando…</span> : "🔑 Actualizar Contraseña"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Quorum */}
          {section === "quorum" && (
            <div className="card card-p-lg">
              <h2 className="section-title">📊 Reglas de Quórum</h2>
              <p className="text-sm text-muted mb-6">Configura cómo se calcula el quórum y las mayorías para las mociones.</p>
              <div className="form-section">
                <div className="form-group">
                  <label htmlFor="quorum-rule" className="form-label">
                    Método Principal de Quórum
                  </label>
                  <select
                    id="quorum-rule"
                    className="form-select"
                    value={quorum.rule}
                    onChange={(e) => setQuorum((q) => ({ ...q, rule: e.target.value }))}
                  >
                    <option value="COEFFICIENT">Ponderado por Alícuota (%)</option>
                    <option value="HEADCOUNT">Mayoría Simple por Cabeza (1 persona = 1 voto)</option>
                    <option value="SUPERMAJORITY">Mayoría Calificada (2/3 de las alícuotas)</option>
                  </select>
                </div>
                <div className="form-group" style={{ maxWidth: 200 }}>
                  <label htmlFor="quorum-threshold" className="form-label">
                    Umbral Requerido (%)
                  </label>
                  <input
                    id="quorum-threshold"
                    type="number"
                    className="form-input"
                    min={1}
                    max={100}
                    value={quorum.threshold}
                    onChange={(e) => setQuorum((q) => ({ ...q, threshold: e.target.value }))}
                  />
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={() => save("Reglas de quórum")} disabled={saving}>
                    {saving ? <span className="spin">⟳ Guardando…</span> : "💾 Guardar Reglas"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Channels */}
          {section === "channels" && (
            <div className="card card-p-lg">
              <h2 className="section-title">📱 Canales de Votación</h2>
              <p className="text-sm text-muted mb-6">Activa o desactiva las vías por donde los miembros pueden votar.</p>
              <div className="form-section">
                {[
                  { key: "webEnabled" as const, icon: "🌐", label: "Dashboard Web", desc: "Votación directa mediante navegador." },
                  { key: "whatsappEnabled" as const, icon: "💬", label: "Bot de WhatsApp", desc: "Los miembros votan respondiendo un mensaje con 1, 2 o 3." },
                  { key: "telegramEnabled" as const, icon: "✈️", label: "Bot de Telegram", desc: "Votación con botones en línea de Telegram." },
                ].map((ch) => (
                  <div
                    key={ch.key}
                    className="card card-p flex items-center justify-between gap-4"
                    style={{ borderColor: channels[ch.key] ? "rgba(99,102,241,0.3)" : "var(--border)" }}
                  >
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: "1.75rem" }}>{ch.icon}</span>
                      <div>
                        <p className="font-bold text-sm">{ch.label}</p>
                        <p className="text-xs text-muted mt-1">{ch.desc}</p>
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm ${channels[ch.key] ? "btn-success" : "btn-secondary"}`}
                      onClick={() => setChannels((c) => ({ ...c, [ch.key]: !c[ch.key] }))}
                    >
                      {channels[ch.key] ? "✅ Habilitado" : "Habilitar"}
                    </button>
                  </div>
                ))}
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={() => save("Canales de votación")} disabled={saving}>
                    {saving ? <span className="spin">⟳ Guardando…</span> : "💾 Guardar Canales"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {section === "notifications" && (
            <div className="card card-p-lg">
              <h2 className="section-title">🔔 Notificaciones</h2>
              <div className="form-section">
                {[
                  { key: "emailOnVoteOpen" as const, label: "Correo al abrir votación", desc: "Avisar por correo cuando se lance una nueva moción." },
                  { key: "emailOnClose" as const, label: "Correo al cerrar votación", desc: "Enviar resumen del escrutinio al finalizar." },
                  { key: "whatsappReminder" as const, label: "Recordatorio por WhatsApp", desc: "Aviso 5 minutos antes del cierre de la moción." },
                ].map((n) => (
                  <div key={n.key} className="card card-p flex items-center justify-between gap-4">
                    <div>
                      <p className="font-bold text-sm">{n.label}</p>
                      <p className="text-xs text-muted mt-1">{n.desc}</p>
                    </div>
                    <button
                      className={`btn btn-sm ${notifs[n.key] ? "btn-success" : "btn-secondary"}`}
                      onClick={() => setNotifs((c) => ({ ...c, [n.key]: !c[n.key] }))}
                    >
                      {notifs[n.key] ? "✅ Activo" : "Desactivado"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Danger Zone */}
          {section === "danger" && (
            <div className="card card-p-lg" style={{ borderColor: "rgba(244,63,94,0.3)" }}>
              <h2 className="section-title" style={{ color: "var(--rose)" }}>
                ⚠️ Zona de Peligro
              </h2>
              <p className="text-sm text-muted mb-6">Estas acciones son irreversibles. Procede con precaución.</p>
              <div className="form-section">
                {[
                  { label: "Archivar todas las asambleas", desc: "Las mociones se congelan y ya no aceptan votos.", btn: "Archivar" },
                  { label: "Reiniciar datos del condominio", desc: "Borra las asambleas y votos manteniendo los propietarios.", btn: "Reiniciar" },
                ].map((a) => (
                  <div key={a.label} className="card card-p flex items-center justify-between gap-4" style={{ borderColor: "rgba(244,63,94,0.2)" }}>
                    <div>
                      <p className="font-bold text-sm">{a.label}</p>
                      <p className="text-xs text-muted mt-1">{a.desc}</p>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => alert("Función protegida en modo demo")}>
                      {a.btn}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

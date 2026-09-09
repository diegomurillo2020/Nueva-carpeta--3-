"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useTenant } from "@/lib/TenantContext";
import ActiveCondominiumBanner from "@/components/ActiveCondominiumBanner";

type Step = "details" | "motions" | "review";

interface MotionDraft {
  title: string;
  description: string;
  durationSeconds: number;
}

export default function NewMeetingPage() {
  const router = useRouter();
  const { getAuthHeaders, user } = useAuth();
  const { activeOrg, loading: tenantLoading } = useTenant();
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const [step, setStep] = useState<Step>("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Step 1 – Meeting details
  const [title, setTitle] = useState("");

  // Step 2 – Motions
  const [motions, setMotions] = useState<MotionDraft[]>([
    { title: "", description: "", durationSeconds: 120 },
  ]);

  const addMotion = () => setMotions((m) => [...m, { title: "", description: "", durationSeconds: 120 }]);
  const removeMotion = (i: number) => setMotions((m) => m.filter((_, idx) => idx !== i));
  const updateMotion = (i: number, field: keyof MotionDraft, val: string | number) =>
    setMotions((m) => m.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreate = async () => {
    if (!activeOrg?.id) {
      setError("No hay un condominio activo seleccionado. Espera a que cargue o vuelve a iniciar sesión.");
      return;
    }

    const validMotions = motions.filter((m) => m.title.trim());
    if (validMotions.length === 0) {
      setError("Agrega al menos una moción para que la asamblea tenga opciones de votación.");
      setStep("motions");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authHeaders = getAuthHeaders();
      const headers = {
        ...authHeaders,
        "Content-Type": "application/json",
      };

      // 1. Create meeting linked to active condominium
      const res = await fetch(`${api}/api/v1/meetings`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: title.trim(),
          organizationId: activeOrg.id,
        }),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || `HTTP ${res.status}`);
      }

      const { data: meeting } = await res.json();

      // 2. Create attached motions if any were specified
      for (const m of validMotions) {
        const motionRes = await fetch(`${api}/api/v1/motions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            meetingId: meeting.id,
            title: m.title.trim(),
            description: m.description.trim() || undefined,
            options: ["YES", "NO", "ABSTAIN"],
            durationSeconds: m.durationSeconds || 120,
            organizationId: activeOrg.id,
          }),
        });

        if (!motionRes.ok) {
          const motionError = await motionRes.json().catch(() => ({}));
          throw new Error(motionError.message || `No se pudo crear la moción "${m.title.trim()}".`);
        }
      }

      showToast(`✅ Asamblea "${meeting.title}" creada exitosamente en ${activeOrg?.name || "el condominio"}.`);
      setTimeout(() => router.push(`/admin/meetings/${meeting.id}?orgId=${encodeURIComponent(activeOrg.id)}`), 1200);
    } catch (e: unknown) {
      if (e instanceof TypeError && (e.message.includes("fetch") || e.message.includes("Failed"))) {
        setError("Error de conexión (Failed to fetch): El servidor backend no responde en " + api + ". Asegúrate de que el backend esté ejecutándose (npm run dev o docker compose up).");
      } else {
        setError(e instanceof Error ? e.message : "Error al crear la asamblea.");
      }
    } finally {
      setLoading(false);
    }
  };

  const STEPS: { key: Step; label: string; icon: string }[] = [
    { key: "details", label: "Detalles", icon: "📋" },
    { key: "motions", label: "Mociones", icon: "🗳️" },
    { key: "review", label: "Revisión", icon: "✅" },
  ];

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      {/* Toast */}
      {toast && (
        <div className="toast-wrap" role="status" aria-live="polite">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}

      <div className="breadcrumb">
        <a href="/admin">Dashboard</a>
        <span className="breadcrumb-sep">/</span>
        <a href="/admin/meetings">Asambleas</a>
        <span className="breadcrumb-sep">/</span>
        <span>Nueva</span>
      </div>

      {/* Prominent Active Condominium Banner */}
      <ActiveCondominiumBanner subtitle="Estás configurando una nueva asamblea oficial para este condominio." />

      <div className="page-header">
        <h1 className="page-title">Crear Nueva Asamblea</h1>
        <p className="page-sub">
          Configura una sesión formal de asamblea con sus mociones y votaciones en tiempo real para{" "}
          <strong className="text-accent">{activeOrg?.name || "tu condominio"}</strong>.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-3 mb-8" role="tablist" aria-label="Pasos del formulario">
        {STEPS.map((s, i) => {
          const idx = STEPS.findIndex((x) => x.key === step);
          const done = i < idx;
          const active = s.key === step;
          return (
            <button
              key={s.key}
              role="tab"
              aria-selected={active}
              aria-label={`Paso ${i + 1}: ${s.label}`}
              className={`btn btn-sm flex-1 ${active ? "btn-primary" : done ? "btn-success" : "btn-secondary"}`}
              onClick={() => (done || active ? setStep(s.key) : undefined)}
              style={{ pointerEvents: done || active ? "auto" : "none", opacity: i > idx ? 0.5 : 1 }}
              id={`step-btn-${s.key}`}
            >
              {s.icon} {s.label}
            </button>
          );
        })}
      </div>

      {/* Step 1: Meeting Details */}
      {step === "details" && (
        <div className="card card-p-lg" role="tabpanel" aria-labelledby="step-btn-details">
          <h2 className="section-title">📋 Detalles de la Asamblea</h2>
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="meeting-title" className="form-label form-label-required">
                Título de la Asamblea
              </label>
              <input
                id="meeting-title"
                type="text"
                className="form-input"
                placeholder="ej. Asamblea General Ordinaria de Copropietarios 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-required="true"
                autoFocus
              />
              <span className="form-hint">Este nombre aparecerá en todas las actas y notificaciones oficiales.</span>
            </div>

            {/* Condominium context confirmation */}
            <div className="card card-p" style={{ background: "rgba(99,102,241,0.05)", borderColor: "rgba(99,102,241,0.25)" }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "1.25rem" }}>🏢</span>
                <div>
                  <span className="text-xs text-muted font-bold">CONDOMINIO DESTINO:</span>
                  <p className="font-bold text-sm text-accent">{activeOrg?.name || "Condominio Principal"}</p>
                </div>
              </div>
            </div>

            {error && (
              <p className="form-error" role="alert">
                ⚠️ {error}
              </p>
            )}
          </div>
          <div className="form-actions mt-6">
            <a href="/admin/meetings" className="btn btn-secondary">
              Cancelar
            </a>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!title.trim()) {
                  setError("El título es obligatorio");
                  return;
                }
                setError(null);
                setStep("motions");
              }}
              id="btn-next-motions"
            >
              Siguiente: Mociones →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Motions */}
      {step === "motions" && (
        <div className="card card-p-lg" role="tabpanel" aria-labelledby="step-btn-motions">
          <h2 className="section-title">🗳️ Mociones del Orden del Día</h2>
          <p className="text-sm text-muted mb-6">Añade los puntos que serán sometidos a votación en esta asamblea.</p>
          <div className="form-section">
            {motions.map((m, i) => (
              <div key={i} className="card card-p" style={{ border: "1px solid var(--border-2)" }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="motion-num">Moción #{i + 1}</span>
                  {motions.length > 1 && (
                    <button
                      className="btn btn-danger btn-sm btn-icon-sm"
                      onClick={() => removeMotion(i)}
                      aria-label={`Eliminar moción ${i + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor={`motion-title-${i}`} className="form-label form-label-required">
                      Título de la Moción
                    </label>
                    <input
                      id={`motion-title-${i}`}
                      type="text"
                      className="form-input"
                      placeholder="ej. Aprobación del Presupuesto Anual de Gastos 2026"
                      value={m.title}
                      onChange={(e) => updateMotion(i, "title", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`motion-desc-${i}`} className="form-label">
                      Descripción / Sustento
                    </label>
                    <textarea
                      id={`motion-desc-${i}`}
                      className="form-textarea"
                      rows={2}
                      placeholder="Detalles sobre lo que se somete a aprobación..."
                      value={m.description}
                      onChange={(e) => updateMotion(i, "description", e.target.value)}
                    />
                  </div>
                <div className="form-group" style={{ maxWidth: 280 }}>
  <label className="form-label">
    Duración de Votación
  </label>
  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
    {/* Campo Minutos */}
    <div style={{ flex: 1 }}>
      <input
        id={`motion-dur-min-${i}`}
        type="number"
        className="form-input"
        placeholder="Min"
        min={0}
        max={10}
        value={Math.floor((m.durationSeconds || 0) / 60)}
        onChange={(e) => {
          const mins = Math.max(0, parseInt(e.target.value) || 0);
          const secs = (m.durationSeconds || 0) % 60;
          updateMotion(i, "durationSeconds", mins * 60 + secs);
        }}
      />
      <small style={{ fontSize: '11px', color: '#666' }}>Minutos</small>
    </div>

    <span>:</span>

    {/* Campo Segundos */}
    <div style={{ flex: 1 }}>
      <input
        id={`motion-dur-sec-${i}`}
        type="number"
        className="form-input"
        placeholder="Seg"
        min={0}
        max={59}
        value={(m.durationSeconds || 0) % 60}
        onChange={(e) => {
          const mins = Math.floor((m.durationSeconds || 0) / 60);
          const secs = Math.min(59, Math.max(0, parseInt(e.target.value) || 0));
          updateMotion(i, "durationSeconds", mins * 60 + secs);
        }}
      />
      <small style={{ fontSize: '11px', color: '#666' }}>Segundos</small>
    </div>
  </div>
</div>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary w-full" onClick={addMotion} id="btn-add-motion">
              ＋ Añadir Otra Moción
            </button>
          </div>
          <div className="form-actions mt-6">
            <button className="btn btn-secondary" onClick={() => setStep("details")}>
              ← Atrás
            </button>
            <button className="btn btn-primary" onClick={() => setStep("review")} id="btn-next-review">
              Siguiente: Revisar y Crear →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === "review" && (
        <div className="card card-p-lg" role="tabpanel" aria-labelledby="step-btn-review">
          <h2 className="section-title">✅ Revisión Final</h2>
          <div className="form-section">
            <div className="card card-p" style={{ borderColor: "rgba(99,102,241,0.3)" }}>
              <div className="form-group mb-2">
                <span className="text-xs text-muted font-bold">CONDOMINIO:</span>
                <p className="font-bold text-accent">{activeOrg?.name}</p>
              </div>
              <div className="form-group">
                <span className="text-xs text-muted font-bold">TÍTULO DE LA ASAMBLEA:</span>
                <p className="font-bold mt-1" style={{ fontSize: "1.1rem" }}>
                  {title}
                </p>
              </div>
            </div>

            {motions.filter((m) => m.title).length > 0 && (
              <div>
                <p className="form-label mb-3">Mociones a registrar ({motions.filter((m) => m.title).length})</p>
                {motions
                  .filter((m) => m.title)
                  .map((m, i) => (
                    <div key={i} className="flex items-start gap-3 mb-3 p-3 card">
                      <span className="motion-num" style={{ marginTop: "0.15rem" }}>
                        #{i + 1}
                      </span>
                      <div>
                        <p className="font-bold text-sm">{m.title}</p>
                        {m.description && <p className="text-xs text-muted mt-1">{m.description}</p>}
                        <p className="text-xs text-accent mt-1">⏱️ {m.durationSeconds}s · Opciones: SÍ / NO / ABSTENCIÓN</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {error && (
              <div className="conn-result conn-err" role="alert">
                ⚠️ {error}
              </div>
            )}
          </div>

          <div className="form-actions mt-6">
            <button className="btn btn-secondary" onClick={() => setStep("motions")}>
              ← Modificar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={loading || tenantLoading || !activeOrg?.id}
              id="btn-create-meeting-submit"
            >
              {loading ? (
                <>
                  <span className="spin">⟳</span> Creando Asamblea…
                </>
              ) : (
                "🚀 Crear y Publicar Asamblea"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

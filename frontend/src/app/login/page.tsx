"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

type AuthMode = "signin" | "signup" | "magiclink";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("diegodanielalejomurillo@gmail.com");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // If already logged in, show status & redirect option
  if (user) {
    return (
      <div className="container" style={{ maxWidth: 480, paddingTop: "3rem" }}>
        <div className="card card-p-lg text-center">
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>👤</div>
          <h1 className="page-title" style={{ fontSize: "1.5rem" }}>Sesión Activa</h1>
          <p className="text-sm text-muted mt-2">
            Has iniciado sesión como <strong className="text-accent">{user.email}</strong>
          </p>
          <div className="flex gap-3 justify-between mt-6">
            <button className="btn btn-secondary flex-1" onClick={() => supabase.auth.signOut()}>
              Cerrar Sesión
            </button>
            <a href="/admin" className="btn btn-primary flex-1">
              Ir al Dashboard →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (data.session) {
          setMessage({ text: "¡Inicio de sesión exitoso! Redirigiendo...", type: "success" });
          setTimeout(() => router.push("/admin"), 1000);
        }
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName || email.split("@")[0] },
          },
        });

        if (error) throw error;
        if (data.session) {
          setMessage({ text: "¡Cuenta creada e iniciada sesión!", type: "success" });
          setTimeout(() => router.push("/admin"), 1000);
        } else {
          setMessage({
            text: "Cuenta creada. Revisa tu correo electrónico para confirmar la cuenta si la verificación está activa.",
            type: "success",
          });
        }
      } else if (mode === "magiclink") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });

        if (error) throw error;
        setMessage({
          text: `Se ha enviado un enlace de acceso mágico a ${email}. Revisa tu bandeja de entrada.`,
          type: "success",
        });
      }
    } catch (err: any) {
      setMessage({
        text: err.message || "Error al autenticar. Por favor verifica tus credenciales.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 460, paddingTop: "2rem", paddingBottom: "4rem" }}>
      <div className="breadcrumb text-center mb-6">
        <a href="/">Inicio</a>
        <span className="breadcrumb-sep">/</span>
        <span>Autenticación</span>
      </div>

      <div className="card card-p-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="brand-icon" style={{ margin: "0 auto 1rem", width: 48, height: 48, fontSize: 24 }}>
            🔐
          </div>
          <h1 className="page-title" style={{ fontSize: "1.75rem" }}>
            {mode === "signin" ? "Iniciar Sesión" : mode === "signup" ? "Crear Cuenta Admin" : "Acceso con Magic Link"}
          </h1>
          <p className="page-sub" style={{ margin: "0.25rem auto 0" }}>
            {mode === "signin"
              ? "Ingresa con tus credenciales de Supabase"
              : mode === "signup"
              ? "Crea una nueva cuenta de administrador"
              : "Recibe un enlace directo en tu correo sin contraseña"}
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-1 mb-6 p-1" style={{ background: "var(--surface-2)", borderRadius: "var(--r-md)" }}>
          <button
            type="button"
            className={`btn btn-sm flex-1 ${mode === "signin" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setMode("signin"); setMessage(null); }}
          >
            Contraseña
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-1 ${mode === "magiclink" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setMode("magiclink"); setMessage(null); }}
          >
            Magic Link
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-1 ${mode === "signup" ? "btn-primary" : "btn-ghost"}`}
            onClick={() => { setMode("signup"); setMessage(null); }}
          >
            Registro
          </button>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`conn-result ${message.type === "success" ? "conn-ok" : "conn-err"} mb-4`}
            style={{ marginTop: 0 }}
          >
            {message.type === "success" ? "✅" : "⚠️"} {message.text}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            {mode === "signup" && (
              <div className="form-group">
                <label className="form-label form-label-required" htmlFor="fullName">
                  Nombre Completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  placeholder="Diego Alejo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={mode === "signup"}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label form-label-required" htmlFor="email">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {mode !== "magiclink" && (
              <div className="form-group">
                <div className="flex justify-between items-center">
                  <label className="form-label form-label-required" htmlFor="password">
                    Contraseña
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      className="text-xs text-accent"
                      style={{ background: "transparent", border: "none", cursor: "pointer" }}
                      onClick={() => setMode("magiclink")}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={mode !== "magiclink"}
                  minLength={6}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-full mt-4"
              disabled={loading}
              id="btn-auth-submit"
            >
              {loading ? (
                <>
                  <span className="spin">⟳</span> Procesando…
                </>
              ) : mode === "signin" ? (
                "🔐 Iniciar Sesión"
              ) : mode === "signup" ? (
                "🚀 Registrar Administrador"
              ) : (
                "📧 Enviar Magic Link"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

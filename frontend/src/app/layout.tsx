import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { TenantProvider } from "@/lib/TenantContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: { default: "ConvoAssemble Enterprise", template: "%s | ConvoAssemble" },
  description: "Sistema SaaS de Votaciones y Actas Inteligentes para Condominios y Asociaciones con aislamiento Multi-Tenant y RBAC.",
  keywords: ["votacion digital", "asambleas", "condominios", "propiedad horizontal", "supabase", "realtime", "quorum", "whatsapp bot"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="bg-grid" aria-hidden="true" />
        <div className="bg-orbs" aria-hidden="true">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
        </div>

        <AuthProvider>
          <TenantProvider>
            <div className="app-wrap">
              <Navbar />

              {/* ── Page content ── */}
              <main className="main" id="main-content">
                {children}
              </main>

              {/* ── Footer ── */}
              <footer style={{ borderTop: "1px solid var(--border)", padding: "1.25rem 0", marginTop: "auto" }}>
                <div className="container flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-muted">© 2026 ConvoAssemble — Gestión de Asambleas & Propiedad Horizontal</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted flex items-center gap-2">
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "var(--emerald)",
                          display: "inline-block",
                          boxShadow: "0 0 6px var(--emerald-glow)",
                        }}
                      />
                      Supabase & Docker Online
                    </span>
                    <a href="/admin/settings" className="text-xs text-muted">
                      Configuración
                    </a>
                    <a href="/login" className="text-xs text-muted">
                      Acceso
                    </a>
                  </div>
                </div>
              </footer>
            </div>
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

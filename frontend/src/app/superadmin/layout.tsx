"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isSuperadmin =
    user?.email?.toLowerCase() === "diegodanielalejomurillo@gmail.com" ||
    (user?.user_metadata?.role === "SUPERADMIN");

  useEffect(() => {
    // If not loading and not superadmin, notify or handle
    if (!loading && user && !isSuperadmin) {
      console.warn("[Superadmin] Non-superadmin user attempting access to superadmin portal.");
    }
  }, [user, loading, isSuperadmin]);

  const NAV = [
    { href: "/superadmin", label: "📊 Resumen Global", exact: true },
    { href: "/superadmin/organizations", label: "🏢 Condominios", exact: false },
    { href: "/superadmin/roles", label: "🔑 Roles & Permisos (RBAC)", exact: false },
    { href: "/superadmin/users", label: "👥 Usuarios Globales", exact: false },
  ];

  return (
    <div>
      {/* Superadmin Crown Banner */}
      <div
        style={{
          background: "linear-gradient(90deg, rgba(168,85,247,0.15), rgba(99,102,241,0.15))",
          borderBottom: "1px solid rgba(168,85,247,0.3)",
          padding: "0.5rem 0",
        }}
      >
        <div className="container flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "1.1rem" }}>👑</span>
            <span className="text-xs font-bold" style={{ color: "var(--accent-3)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Panel de Superadministrador Global
            </span>
            <span className="badge badge-open" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
              Multi-Tenant Root
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted font-mono">
              Operando como: <strong style={{ color: "#fff" }}>diegodanielalejomurillo@gmail.com</strong>
            </span>
            <a href="/admin" className="btn btn-ghost btn-sm text-xs" style={{ padding: "0.2rem 0.5rem" }}>
              ← Ir a Vista de Condominio
            </a>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: "1.5rem" }}>
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
                style={{ borderRadius: "var(--r-md)" }}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}

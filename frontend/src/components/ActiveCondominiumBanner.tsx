"use client";

import { useTenant } from "@/lib/TenantContext";
import { useAuth } from "@/lib/AuthContext";

export default function ActiveCondominiumBanner({ subtitle }: { subtitle?: string }) {
  const { activeOrg, allOrgs, setActiveOrgId, loading } = useTenant();
  const { user } = useAuth();

  const isSuperadmin =
    user?.email?.toLowerCase() === "diegodanielalejomurillo@gmail.com" ||
    user?.user_metadata?.role === "SUPERADMIN";

  if (loading) {
    return (
      <div className="card card-p mb-6" style={{ background: "rgba(99,102,241,0.05)" }}>
        <div className="skeleton skeleton-text" style={{ width: "40%" }} />
      </div>
    );
  }

  if (!activeOrg) return null;

  return (
    <div
      className="card card-p mb-6"
      style={{
        background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))",
        borderColor: "rgba(99,102,241,0.35)",
        boxShadow: "0 4px 24px rgba(99,102,241,0.15)",
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--r-md)",
              background: "linear-gradient(135deg, var(--accent), var(--purple))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              boxShadow: "0 0 16px var(--accent-glow)",
              flexShrink: 0,
            }}
          >
            🏢
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-open" style={{ fontSize: "0.68rem" }}>
                Condominio Activo
              </span>
              <span className="text-xs font-mono text-muted">ID: {activeOrg.id.slice(0, 8)}…</span>
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", marginTop: "0.15rem" }}>
              {activeOrg.name}
            </h2>
            {activeOrg.address && (
              <p className="text-xs text-muted">📍 {activeOrg.address}</p>
            )}
            {subtitle && <p className="text-xs text-accent mt-1">{subtitle}</p>}
          </div>
        </div>

        {/* Superadmin Tenant Switcher */}
        {isSuperadmin && allOrgs.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-bold">Cambiar Condominio:</span>
            <select
              className="form-select"
              style={{
                fontSize: "0.82rem",
                padding: "0.4rem 0.75rem",
                background: "rgba(6,10,18,0.8)",
                borderColor: "rgba(99,102,241,0.4)",
                color: "var(--accent-3)",
                fontWeight: 600,
                width: "auto",
              }}
              value={activeOrg.id}
              onChange={(e) => setActiveOrgId(e.target.value)}
            >
              {allOrgs.map((org) => (
                <option key={org.id} value={org.id}>
                  🏢 {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

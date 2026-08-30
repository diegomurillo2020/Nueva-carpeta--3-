"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const isSuperadmin =
    user?.email?.toLowerCase() === "diegodanielalejomurillo@gmail.com" ||
    (user?.user_metadata?.role === "SUPERADMIN");

  return (
    <header className="navbar">
      <div className="container">
        <nav className="navbar-inner" aria-label="Main navigation">
          <a href="/" className="navbar-brand" aria-label="ConvoAssemble home">
            <div className="brand-icon" aria-hidden="true">🗳️</div>
            <span className="brand-name">ConvoAssemble</span>
            <span className="brand-version">Enterprise</span>
          </a>

          <div className="navbar-nav" role="menubar">
            {/* Global Superadmin Link if user is superadmin */}
            {isSuperadmin && (
              <a
                href="/superadmin"
                className={`nav-link ${pathname?.startsWith("/superadmin") ? "active" : ""}`}
                style={{
                  color: pathname?.startsWith("/superadmin") ? "var(--amber)" : "var(--accent-3)",
                  fontWeight: 700,
                }}
                role="menuitem"
              >
                <span className="nav-link-icon">👑</span> Superadmin
              </a>
            )}

            <a
              href="/admin"
              className={`nav-link ${pathname === "/admin" ? "active" : ""}`}
              role="menuitem"
            >
              <span className="nav-link-icon">📊</span> Dashboard
            </a>
            <a
              href="/admin/meetings"
              className={`nav-link ${pathname?.startsWith("/admin/meetings") && pathname !== "/admin/meetings/new" ? "active" : ""}`}
              role="menuitem"
            >
              <span className="nav-link-icon">📅</span> Asambleas
            </a>
            <a
              href="/admin/members"
              className={`nav-link ${pathname === "/admin/members" ? "active" : ""}`}
              role="menuitem"
            >
              <span className="nav-link-icon">👥</span> Miembros
            </a>
            <a
              href="/admin/settings"
              className={`nav-link ${pathname === "/admin/settings" ? "active" : ""}`}
              role="menuitem"
            >
              <span className="nav-link-icon">⚙️</span> Ajustes
            </a>
          </div>

          <div className="navbar-actions">
            <a href="/admin/meetings/new" className="btn btn-primary btn-sm" id="btn-new-meeting">
              ＋ Nueva Asamblea
            </a>

            <div className="nav-divider" aria-hidden="true" />

            {user ? (
              <div className="flex items-center gap-2">
                <div
                  className="avatar"
                  style={{
                    width: 32,
                    height: 32,
                    fontSize: 12,
                    background: isSuperadmin ? "linear-gradient(135deg, #f59e0b, #d97706)" : undefined,
                  }}
                  title={user.email}
                >
                  {isSuperadmin ? "👑" : (user.email ?? "U").charAt(0).toUpperCase()}
                </div>
                <span
                  className="text-xs font-mono text-muted"
                  style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {user.email}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => signOut()}
                  title="Cerrar sesión"
                >
                  🚪 Salir
                </button>
              </div>
            ) : (
              <a href="/login" className="btn btn-secondary btn-sm" id="btn-login-nav">
                🔐 Iniciar Sesión
              </a>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

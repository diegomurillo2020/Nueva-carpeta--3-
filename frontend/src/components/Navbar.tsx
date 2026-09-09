"use client";

import { useAuth } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import { BarChart3, Building2, CalendarDays, LogIn, LogOut, Settings, ShieldCheck, Users, Vote } from "lucide-react";

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
          <Link href="/" className="navbar-brand" aria-label="ConvoAssemble home">
            <div className="brand-icon" aria-hidden="true"><Vote size={20} strokeWidth={2.2} /></div>
            <span className="brand-name">ConvoAssemble</span>
            <span className="brand-version">Enterprise</span>
          </Link>

          <div className="navbar-nav" role="menubar">
            {/* Global Superadmin Link if user is superadmin */}
            {isSuperadmin && (
              <Link
                href="/superadmin"
                className={`nav-link ${pathname?.startsWith("/superadmin") ? "active" : ""}`}
                style={{
                  color: pathname?.startsWith("/superadmin") ? "var(--amber)" : "var(--accent-3)",
                  fontWeight: 700,
                }}
                role="menuitem"
              >
                <ShieldCheck className="nav-link-icon" size={16} /> Superadmin
              </Link>
            )}

            <Link
              href="/admin"
              className={`nav-link ${pathname === "/admin" ? "active" : ""}`}
              role="menuitem"
            >
              <BarChart3 className="nav-link-icon" size={16} /> Dashboard
            </Link>
            <Link
              href="/admin/meetings"
              className={`nav-link ${pathname?.startsWith("/admin/meetings") && pathname !== "/admin/meetings/new" ? "active" : ""}`}
              role="menuitem"
            >
              <CalendarDays className="nav-link-icon" size={16} /> Asambleas
            </Link>
            <Link
              href="/admin/vote"
              className={`nav-link ${pathname === "/admin/vote" ? "active" : ""}`}
              role="menuitem"
            >
              <Vote className="nav-link-icon" size={16} /> Votar
            </Link>
            <Link
              href="/admin/members"
              className={`nav-link ${pathname === "/admin/members" ? "active" : ""}`}
              role="menuitem"
            >
              <Users className="nav-link-icon" size={16} /> Miembros
            </Link>
            <a
              href="/admin/settings"
              className={`nav-link ${pathname === "/admin/settings" ? "active" : ""}`}
              role="menuitem"
            >
              <Settings className="nav-link-icon" size={16} /> Ajustes
            </a>
          </div>

          <div className="navbar-actions">
              <Link href="/admin/meetings/new" className="btn btn-primary btn-sm" id="btn-new-meeting">
              ＋ Nueva Asamblea
            </Link>

            <NotificationBell />
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
                  {isSuperadmin ? <ShieldCheck size={15} /> : (user.email ?? "U").charAt(0).toUpperCase()}
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
                  <LogOut size={15} /> Salir
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn btn-secondary btn-sm" id="btn-login-nav">
                <LogIn size={15} /> Iniciar Sesión
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

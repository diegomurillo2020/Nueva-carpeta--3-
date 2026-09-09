"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isSuperadmin =
    user?.email?.toLowerCase() === "diegodanielalejomurillo@gmail.com" ||
    user?.user_metadata?.role === "SUPERADMIN";

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/admin")}`);
      return;
    }
    if (user && pathname.startsWith("/superadmin") && !isSuperadmin) {
      router.replace("/admin");
    }
  }, [isPublic, isSuperadmin, loading, pathname, router, user]);

  if (loading || (!user && !isPublic) || (pathname.startsWith("/superadmin") && !isSuperadmin)) {
    return <div className="container"><div className="card card-p"><div className="skeleton skeleton-h1" /></div></div>;
  }

  return <>{children}</>;
}
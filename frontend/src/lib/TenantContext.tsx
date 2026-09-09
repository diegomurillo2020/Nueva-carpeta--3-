"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export interface Organization {
  id: string;
  name: string;
  address?: string;
  settings?: any;
  isActive?: boolean;
}

interface TenantContextType {
  activeOrg: Organization | null;
  allOrgs: Organization[];
  setActiveOrgId: (id: string) => void;
  loading: boolean;
  refreshOrgs: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  activeOrg: null,
  allOrgs: [],
  setActiveOrgId: () => {},
  loading: true,
  refreshOrgs: async () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user, getAuthHeaders, loading: authLoading } = useAuth();
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [allOrgs, setAllOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    if (authLoading) return;
    try {
      const headers = getAuthHeaders();

      // 1. Fetch all available organizations
      const res = await fetch(`${api}/api/v1/superadmin/organizations`, { headers });
      if (res.ok) {
        const json = await res.json();
        const orgs = (json.data ?? []).filter((org: Organization) => org.isActive !== false);
        setAllOrgs(orgs);

        // Check if query param or stored preference exists
        const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        const queryOrgId = urlParams?.get("orgId");
        const storedOrgId = typeof window !== "undefined" ? localStorage.getItem("convo_active_org_id") : null;

        const targetOrg =
          orgs.find((o: Organization) => o.id === queryOrgId) ||
          orgs.find((o: Organization) => o.id === storedOrgId) ||
          orgs[0] ||
          null;

        setActiveOrg(targetOrg);
      } else {
        // Fallback to /api/v1/organizations/me
        const meRes = await fetch(`${api}/api/v1/organizations/me`, { headers });
        if (meRes.ok) {
          const meJson = await meRes.json();
          if (meJson.data) {
            setActiveOrg(meJson.data);
            setAllOrgs([meJson.data]);
          }
        }
      }
    } catch (err) {
      console.warn("[TenantContext] Error fetching organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [authLoading]);

  const setActiveOrgId = (id: string) => {
    const found = allOrgs.find((o) => o.id === id);
    if (found) {
      setActiveOrg(found);
      if (typeof window !== "undefined") {
        localStorage.setItem("convo_active_org_id", id);
      }
    }
  };

  return (
    <TenantContext.Provider
      value={{
        activeOrg,
        allOrgs,
        setActiveOrgId,
        loading,
        refreshOrgs: fetchOrganizations,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

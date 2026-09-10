"use client";
// =============================================================================
// ConnectionTest – interactive Supabase DB connection test button
// Calls testConnection() and displays result with latency badge
// =============================================================================
import { useState, useCallback } from "react";
import { testConnection, ConnectionTestResult } from "@/lib/supabase";
import { CheckCircle2, CircleAlert, Database, Globe2, LoaderCircle, PlugZap, UserRound, Zap } from "lucide-react";

type TestState = "idle" | "loading" | "ok" | "error";

export default function ConnectionTest() {
  const [state, setState] = useState<TestState>("idle");
  const [result, setResult] = useState<ConnectionTestResult | null>(null);

  const handleTest = useCallback(async () => {
    setState("loading");
    setResult(null);
    try {
      const res = await testConnection();
      setResult(res);
      setState(res.ok ? "ok" : "error");
    } catch {
      setState("error");
      setResult({ ok: false, latencyMs: 0, projectRef: "unknown", error: "Unexpected error" });
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Bienvenidos al Sistema de Condominios
        </h1>

        <p className="mt-3 text-lg text-gray-600">
          Gestión y administración de su condominio
        </p>
      </div>
    </div>
  );
}

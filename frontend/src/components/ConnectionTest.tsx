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
    <div className="glass-card conn-test-card">
      <div className="conn-test-header">
        <h3 className="conn-test-title">
          <PlugZap size={18} />
          Supabase Connection Test
        </h3>
        <button
          id="btn-test-connection"
          className={`btn ${state === "loading" ? "btn-secondary" : "btn-primary"} btn-sm`}
          onClick={handleTest}
          disabled={state === "loading"}
          aria-live="polite"
        >
          {state === "loading" ? (
            <>
              <LoaderCircle className="spin" size={15} />
              Testing…
            </>
          ) : (
            <>
              <Zap size={15} /> Test Connection
            </>
          )}
        </button>
      </div>

      {/* Connection metadata */}
      <div className="conn-meta">
        <span className="conn-meta-item"><Globe2 size={14} /> <strong>Host:</strong> aws-0-us-east-1.pooler.supabase.com</span>
        <span className="conn-meta-item"><Database size={14} /> <strong>DB:</strong> postgres</span>
        <span className="conn-meta-item"><UserRound size={14} /> <strong>User:</strong> postgres.wrerlobbajyabhljfqgo</span>
        <span className="conn-meta-item"><Database size={14} /> <strong>Port:</strong> 5432</span>
      </div>

      {/* Result panel */}
      {state === "loading" && (
        <div className="conn-result conn-result-loading" role="status">
          <LoaderCircle className="spin" size={16} />
          Pinging <code>wrerlobbajyabhljfqgo.supabase.co</code>…
        </div>
      )}

      {state === "ok" && result && (
        <div className="conn-result conn-result-ok" role="status" aria-label="Connection successful">
          <CheckCircle2 size={16} /> <strong>Connected</strong> - {result.projectRef} responded in{" "}
          <span style={{ fontWeight: 800 }}>{result.latencyMs} ms</span>
        </div>
      )}

      {state === "error" && result && (
        <div role="alert">
          <div className="conn-result conn-result-err">
            <CircleAlert size={16} /> <strong>Failed</strong> - {result.error ?? "Unknown error"} ({result.latencyMs} ms)
          </div>
          <p className="text-xs text-muted mt-2" style={{ paddingLeft: "0.25rem" }}>
            Hint: Check that your <code>DATABASE_URL</code> password is set in <code>.env</code> and that Supabase RLS allows your query.
          </p>
        </div>
      )}

      {state === "idle" && (
        <p className="text-sm text-muted">
          Click <strong>Test Connection</strong> to verify your Supabase cloud database is reachable.
        </p>
      )}
    </div>
  );
}

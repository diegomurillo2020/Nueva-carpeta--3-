// =============================================================================
// Supabase Browser Client – Singleton
// Uses the public ANON key (safe for frontend)
// =============================================================================
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Singleton pattern – avoids creating multiple GoTrue clients in dev
let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    });
  }
  return _supabase;
}

export const supabase = getSupabaseClient();

// =============================================================================
// testConnection – verifies DB reachability via Supabase REST API
// Returns latency in ms or throws on failure
// =============================================================================
export interface ConnectionTestResult {
  ok: boolean;
  latencyMs: number;
  projectRef: string;
  error?: string;
}

export async function testConnection(): Promise<ConnectionTestResult> {
  const start = performance.now();
  try {
    const { error } = await supabase
      .from("organizations")
      .select("id", { count: "exact", head: true });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return {
        ok: false,
        latencyMs,
        projectRef: new URL(SUPABASE_URL).hostname.split(".")[0],
        error: error.message,
      };
    }

    return {
      ok: true,
      latencyMs,
      projectRef: new URL(SUPABASE_URL).hostname.split(".")[0],
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      latencyMs,
      projectRef: "unknown",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

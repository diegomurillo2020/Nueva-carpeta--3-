// =============================================================================
// useMotionTally – Supabase Realtime hook
// Subscribes to INSERT events on the `votes` table filtered by motionId.
// Maintains a live tally { YES, NO, ABSTAIN, total }.
// =============================================================================
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabase";

export interface Tally {
  YES: number;
  NO: number;
  ABSTAIN: number;
  total: number;
}

export interface UseMotionTallyResult {
  tally: Tally;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_TALLY: Tally = { YES: 0, NO: 0, ABSTAIN: 0, total: 0 };

export function useMotionTally(motionId: string | null): UseMotionTallyResult {
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ------------------------------------------------------------------
  // Fetch initial tally from REST (aggregate query on votes table)
  // ------------------------------------------------------------------
  const fetchInitialTally = useCallback(async (mid: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("votes")
        .select("choice")
        .eq("motion_id", mid);

      if (fetchError) throw new Error(fetchError.message);

      const computed: Tally = { YES: 0, NO: 0, ABSTAIN: 0, total: 0 };
      for (const row of data ?? []) {
        const choice = row.choice as keyof Omit<Tally, "total">;
        if (choice in computed) computed[choice]++;
        computed.total++;
      }
      setTally(computed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tally");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // Subscribe to Realtime INSERT events on votes for this motionId
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!motionId) {
      setTally(EMPTY_TALLY);
      setIsConnected(false);
      return;
    }

    // Fetch baseline
    fetchInitialTally(motionId);

    // Subscribe
    const channelName = `votes-motion-${motionId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `motion_id=eq.${motionId}`,
        },
        (payload) => {
          const newVote = payload.new as { choice: string };
          const choice = newVote.choice as keyof Omit<Tally, "total">;
          setTally((prev) => {
            const next = { ...prev };
            if (choice in next) next[choice]++;
            next.total++;
            return next;
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setIsConnected(true);
        if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [motionId, fetchInitialTally]);

  return { tally, isConnected, isLoading, error };
}

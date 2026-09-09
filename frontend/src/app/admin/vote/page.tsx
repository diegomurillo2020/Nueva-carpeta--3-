"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useTenant } from "@/lib/TenantContext";
import MotionCard from "@/components/MotionCard";

interface Meeting {
  id: string;
  title: string;
  status: "DRAFT" | "LIVE" | "CLOSED";
}

interface Motion {
  id: string;
  title: string;
  description?: string;
  status: "OPEN" | "CLOSED";
  options: string[];
  durationSeconds?: number;
  openedAt?: string;
  orderIndex: number;
}

export default function VotePage() {
  const { getAuthHeaders, user, loading: authLoading } = useAuth();
  const { activeOrg, loading: tenantLoading } = useTenant();
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [motions, setMotions] = useState<Motion[]>([]);
  const [votedMotionIds, setVotedMotionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || tenantLoading || !user || !activeOrg?.id) return;

    const orgQuery = `?orgId=${encodeURIComponent(activeOrg.id)}`;
    setLoading(true);
    setError(null);

    fetch(`${api}/api/v1/meetings${orgQuery}`, { headers: getAuthHeaders() })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "No se pudieron cargar las asambleas.");
        return body.data ?? [];
      })
      .then(async (meetings: Meeting[]) => {
        const liveMeeting = meetings.find((item) => item.status === "LIVE") ?? null;
        setMeeting(liveMeeting);
        if (!liveMeeting) return;

        const response = await fetch(`${api}/api/v1/meetings/${liveMeeting.id}/motions${orgQuery}`, {
          headers: getAuthHeaders(),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "No se pudieron cargar las mociones.");
        setMotions(body.data ?? []);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Error de conexión."))
      .finally(() => setLoading(false));
  }, [activeOrg?.id, api, authLoading, getAuthHeaders, tenantLoading, user]);

  const handleVote = async (motionId: string, choice: string) => {
    const response = await fetch(`${api}/api/v1/votes`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ motionId, choice, source: "WEB", organizationId: activeOrg?.id }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "No se pudo registrar el voto.");
    setVotedMotionIds((current) => [...current, motionId]);
  };

  if (authLoading || loading) {
    return <div className="container"><div className="card card-p"><div className="skeleton skeleton-h1" /></div></div>;
  }

  if (!user) {
    return (
      <div className="container">
        <div className="card empty">
          <div className="empty-icon">🔐</div>
          <div className="empty-title">Inicia sesión para votar</div>
          <p className="empty-text">Necesitas una cuenta autenticada y un miembro activo del condominio.</p>
          <a href="/login" className="btn btn-primary">Iniciar sesión</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="breadcrumb">
        <a href="/admin">Dashboard</a><span className="breadcrumb-sep">/</span><span>Votación</span>
      </div>
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title">Votación de la asamblea</h1>
          <p className="page-sub">Selecciona una opción en cada moción abierta. Solo se permite un voto por moción.</p>
        </div>
        <span className="badge badge-live"><span className="live-dot" /> Votación protegida</span>
      </div>

      {error ? (
        <div className="card card-p"><p className="text-danger">⚠️ {error}</p></div>
      ) : !meeting ? (
        <div className="card empty">
          <div className="empty-icon">🕊️</div>
          <div className="empty-title">No hay una asamblea en curso</div>
          <p className="empty-text">Cuando un administrador inicie una asamblea, sus mociones aparecerán aquí.</p>
        </div>
      ) : (
        <>
          <div className="card card-p mb-6 card-accent">
            <span className="badge badge-live"><span className="live-dot" /> En vivo</span>
            <h2 className="section-title" style={{ marginTop: "0.75rem", marginBottom: 0 }}>{meeting.title}</h2>
          </div>
          {motions.length === 0 ? (
            <div className="card empty"><div className="empty-icon">🗳️</div><div className="empty-title">No hay mociones registradas</div></div>
          ) : (
            <div className="flex flex-col gap-4">
              {motions.map((motion) => (
                <MotionCard
                  key={motion.id}
                  motion={motion}
                  meetingStatus={meeting.status}
                  canVote={motion.status === "OPEN" && !votedMotionIds.includes(motion.id)}
                  onVote={handleVote}
                  hasVoted={votedMotionIds.includes(motion.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
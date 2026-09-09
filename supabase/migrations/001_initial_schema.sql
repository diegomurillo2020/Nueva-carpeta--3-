-- =============================================================================
-- Migration: 001_initial_schema.sql
-- ConvoAssemble – Voting & Meeting Minutes SaaS
-- Target: Supabase PostgreSQL (runs inside Supabase SQL Editor or via Prisma)
-- =============================================================================

-- Enable UUID extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE meeting_status AS ENUM ('DRAFT', 'LIVE', 'CLOSED');
CREATE TYPE motion_status  AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE vote_choice    AS ENUM ('YES', 'NO', 'ABSTAIN');
CREATE TYPE vote_source    AS ENUM ('WEB', 'WHATSAPP', 'TELEGRAM');

-- =============================================================================
-- TABLE: organizations
-- Tenant root entity. Each condominium / association is one row.
-- =============================================================================
CREATE TABLE public.organizations (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  -- JSON quorum config, e.g. {"quorumType":"COEFFICIENT","quorumThreshold":0.51}
  settings   JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.organizations IS
  'Tenant root – each condominium or property association occupies one row.';

-- =============================================================================
-- TABLE: users
-- Members and Admins belonging to an Organization.
-- =============================================================================
CREATE TABLE public.users (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dni_passport    TEXT,
  full_name       TEXT        NOT NULL,
  email           TEXT        UNIQUE,
  phone_number    TEXT,
  role            TEXT        NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A member can only be registered once per organization (by DNI)
  UNIQUE (organization_id, dni_passport)
);

CREATE INDEX idx_users_organization ON public.users(organization_id);
CREATE INDEX idx_users_email        ON public.users(email);
CREATE INDEX idx_users_phone        ON public.users(phone_number);

COMMENT ON TABLE public.users IS
  'Members and Administrators within an organization tenant.';

-- =============================================================================
-- TABLE: properties
-- Physical units (apartments, offices) and their voting weight (coefficient).
-- =============================================================================
CREATE TABLE public.properties (
  id                 UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id    UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id           UUID           REFERENCES public.users(id) ON DELETE SET NULL,
  -- Coefficient share / alícuota: e.g. 0.035000 = 3.5%
  coefficient_share  NUMERIC(10,6)  NOT NULL CHECK (coefficient_share > 0),
  unit_identifier    TEXT           NOT NULL, -- e.g. "A-301", "PH-2"
  created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_properties_organization ON public.properties(organization_id);
CREATE INDEX idx_properties_owner        ON public.properties(owner_id);

COMMENT ON TABLE public.properties IS
  'Physical units with their proportional voting weight (coefficient / alícuota).';

-- =============================================================================
-- TABLE: meetings
-- Formal sessions where motions are deliberated and voted on.
-- =============================================================================
CREATE TABLE public.meetings (
  id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id     UUID           NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title               TEXT           NOT NULL,
  status              meeting_status NOT NULL DEFAULT 'DRAFT',
  start_time          TIMESTAMPTZ,
  end_time            TIMESTAMPTZ,
  -- Structured minutes auto-generated at meeting close (Markdown/JSON)
  transcript_summary  TEXT,
  created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meetings_organization ON public.meetings(organization_id);
CREATE INDEX idx_meetings_status       ON public.meetings(status);

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.meetings IS
  'Formal meeting sessions. Status progresses: DRAFT -> LIVE -> CLOSED.';

-- =============================================================================
-- TABLE: motions
-- Individual agenda items (proposals) voted on within a meeting.
-- =============================================================================
CREATE TABLE public.motions (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id       UUID         NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title            TEXT         NOT NULL,
  description      TEXT,
  -- Available vote choices array, e.g. ["YES","NO","ABSTAIN"]
  options          JSONB        NOT NULL DEFAULT '["YES","NO","ABSTAIN"]',
  status           motion_status NOT NULL DEFAULT 'OPEN',
  duration_seconds INTEGER      CHECK (duration_seconds > 0),
  opened_at        TIMESTAMPTZ,
  closed_at        TIMESTAMPTZ,
  order_index      INTEGER      NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_motions_meeting ON public.motions(meeting_id);
CREATE INDEX idx_motions_status  ON public.motions(status);

COMMENT ON TABLE public.motions IS
  'Votable agenda items. Once CLOSED, no further votes are accepted.';

-- =============================================================================
-- TABLE: votes
-- Immutable vote records. One vote per (motion, user) – enforced at DB level.
-- =============================================================================
CREATE TABLE public.votes (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  motion_id UUID        NOT NULL REFERENCES public.motions(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  choice    vote_choice NOT NULL,
  cast_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source    vote_source NOT NULL DEFAULT 'WEB',

  -- *** CRITICAL: database-level duplicate vote prevention ***
  CONSTRAINT uq_vote_motion_user UNIQUE (motion_id, user_id)
);

CREATE INDEX idx_votes_motion ON public.votes(motion_id);
CREATE INDEX idx_votes_user   ON public.votes(user_id);

COMMENT ON TABLE public.votes IS
  'Immutable vote ledger. UNIQUE(motion_id, user_id) prevents double-voting.';

-- =============================================================================
-- FUNCTION: calculate_quorum
-- Returns the current YES+NO+ABSTAIN coefficient sum for a given motion,
-- and whether quorum threshold defined in organization settings is met.
-- Usage: SELECT * FROM calculate_quorum('<motion_uuid>');
-- =============================================================================
CREATE OR REPLACE FUNCTION public.calculate_quorum(p_motion_id UUID)
RETURNS TABLE (
  total_votes       BIGINT,
  yes_count         BIGINT,
  no_count          BIGINT,
  abstain_count     BIGINT,
  coefficient_sum   NUMERIC,
  quorum_threshold  NUMERIC,
  quorum_met        BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id        UUID;
  v_threshold     NUMERIC;
  v_quorum_type   TEXT;
  v_total_coeff   NUMERIC;
BEGIN
  -- Resolve organization from motion -> meeting -> organization
  SELECT m.organization_id
    INTO v_org_id
    FROM public.motions mo
    JOIN public.meetings m ON m.id = mo.meeting_id
   WHERE mo.id = p_motion_id;

  -- Read quorum config from organization settings
  SELECT
    (settings->>'quorumThreshold')::NUMERIC,
    COALESCE(settings->>'quorumType', 'HEADCOUNT')
  INTO v_threshold, v_quorum_type
  FROM public.organizations
  WHERE id = v_org_id;

  -- Total coefficient of active properties in the organization
  SELECT COALESCE(SUM(coefficient_share), 0)
    INTO v_total_coeff
    FROM public.properties
   WHERE organization_id = v_org_id
     AND owner_id IN (SELECT id FROM public.users WHERE organization_id = v_org_id AND is_active = TRUE);

  RETURN QUERY
  SELECT
    COUNT(v.id)                                                         AS total_votes,
    COUNT(v.id) FILTER (WHERE v.choice = 'YES')                        AS yes_count,
    COUNT(v.id) FILTER (WHERE v.choice = 'NO')                         AS no_count,
    COUNT(v.id) FILTER (WHERE v.choice = 'ABSTAIN')                    AS abstain_count,
    COALESCE(SUM(p.coefficient_share), 0)                              AS coefficient_sum,
    COALESCE(v_threshold, 0.5)                                         AS quorum_threshold,
    CASE
      WHEN v_quorum_type = 'COEFFICIENT' THEN
        COALESCE(SUM(p.coefficient_share), 0) >= COALESCE(v_threshold, 0.5) * v_total_coeff
      ELSE
        -- HEADCOUNT: simple majority
        COUNT(v.id) > (
          SELECT COUNT(*) / 2.0
          FROM public.users
          WHERE organization_id = v_org_id AND is_active = TRUE
        )
    END                                                                 AS quorum_met
  FROM public.votes v
  JOIN public.users u         ON u.id = v.user_id
  JOIN public.properties p    ON p.owner_id = u.id AND p.organization_id = v_org_id
  WHERE v.motion_id = p_motion_id;
END;
$$;

COMMENT ON FUNCTION public.calculate_quorum IS
  'Calculates real-time quorum for a motion. Supports COEFFICIENT and HEADCOUNT modes.';

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Multi-tenant isolation: users can only access rows belonging to their org.
-- Supabase Auth JWT must include custom claim: { "org_id": "<uuid>" }
-- =============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes         ENABLE ROW LEVEL SECURITY;

-- Helper: extract org_id from JWT
CREATE OR REPLACE FUNCTION public.jwt_org_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT (current_setting('request.jwt.claims', TRUE)::JSONB ->> 'org_id')::UUID;
$$;

-- Helper: extract user role from JWT
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT current_setting('request.jwt.claims', TRUE)::JSONB ->> 'user_role';
$$;

-- ---- organizations ----------------------------------------------------------
-- Users can only see their own organization
CREATE POLICY "org_isolation" ON public.organizations
  FOR ALL USING (id = public.jwt_org_id());

-- ---- users ------------------------------------------------------------------
CREATE POLICY "users_org_isolation" ON public.users
  FOR ALL USING (organization_id = public.jwt_org_id());

-- ---- properties -------------------------------------------------------------
CREATE POLICY "properties_org_isolation" ON public.properties
  FOR ALL USING (organization_id = public.jwt_org_id());

-- ---- meetings ---------------------------------------------------------------
-- SELECT: all members of org; INSERT/UPDATE/DELETE: admins only
CREATE POLICY "meetings_read" ON public.meetings
  FOR SELECT USING (organization_id = public.jwt_org_id());

CREATE POLICY "meetings_write" ON public.meetings
  FOR ALL USING (
    organization_id = public.jwt_org_id()
    AND public.jwt_role() = 'ADMIN'
  );

-- ---- motions ----------------------------------------------------------------
CREATE POLICY "motions_read" ON public.motions
  FOR SELECT USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE organization_id = public.jwt_org_id()
    )
  );

CREATE POLICY "motions_write" ON public.motions
  FOR ALL USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE organization_id = public.jwt_org_id()
    )
    AND public.jwt_role() = 'ADMIN'
  );

-- ---- votes ------------------------------------------------------------------
-- Members can INSERT their own votes; they can SELECT all votes for their org's motions
CREATE POLICY "votes_read" ON public.votes
  FOR SELECT USING (
    motion_id IN (
      SELECT mo.id FROM public.motions mo
      JOIN public.meetings m ON m.id = mo.meeting_id
      WHERE m.organization_id = public.jwt_org_id()
    )
  );

CREATE POLICY "votes_insert_own" ON public.votes
  FOR INSERT WITH CHECK (
    -- User is casting their own vote
    user_id IN (SELECT id FROM public.users WHERE id = auth.uid())
    -- Motion belongs to user's organization
    AND motion_id IN (
      SELECT mo.id FROM public.motions mo
      JOIN public.meetings m ON m.id = mo.meeting_id
      WHERE m.organization_id = public.jwt_org_id()
    )
    -- Motion must still be OPEN
    AND motion_id IN (
      SELECT id FROM public.motions WHERE status = 'OPEN'
    )
  );

-- No UPDATE or DELETE on votes (immutable ledger)
-- (No policy = denied by default when RLS is enabled)

-- =============================================================================
-- SUPABASE REALTIME
-- Enable real-time publication for live vote count broadcasting
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.motions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;

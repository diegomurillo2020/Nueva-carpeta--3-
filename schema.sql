-- =============================================================================
-- ConvoAssemble Database Schema & Multi-Tenant RLS Blueprint
-- Specification-Driven Development (SDD) - Enterprise RBAC Architecture
-- Target: Supabase PostgreSQL
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE "MeetingStatus" AS ENUM ('DRAFT', 'LIVE', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "MotionStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "VoteChoice" AS ENUM ('YES', 'NO', 'ABSTAIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "VoteSource" AS ENUM ('WEB', 'WHATSAPP', 'TELEGRAM');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =============================================================================
-- 2. RBAC & TENANT TABLES
-- =============================================================================

-- 2.1 ROLES
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- SUPERADMIN, ORG_ADMIN, SECRETARY, MEMBER
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 PERMISSIONS
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,    -- CREATE, READ, UPDATE, DELETE, MANAGE, VOTE
  resource TEXT NOT NULL,  -- ORGANIZATIONS, USERS, PROPERTIES, MEETINGS, MOTIONS, VOTES, ROLES
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_permission_action_resource UNIQUE (action, resource)
);

-- 2.3 ROLE_PERMISSIONS
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

-- 2.4 ORGANIZATIONS (Condominiums / Associations)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  settings JSONB NOT NULL DEFAULT '{"quorumRule": "COEFFICIENT", "threshold": 51}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.5 USERS (Superadmin, Org Admins, Secretaries, Members)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  dni_passport TEXT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_org_dni UNIQUE (organization_id, dni_passport)
);

-- 2.6 PROPERTIES (Condominium units / alícuotas)
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  coefficient_share NUMERIC(10, 6) NOT NULL,
  unit_identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.7 MEETINGS (Assembly sessions)
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status "MeetingStatus" NOT NULL DEFAULT 'DRAFT',
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  transcript_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.8 MOTIONS (Agenda points to be voted)
CREATE TABLE IF NOT EXISTS public.motions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '["YES", "NO", "ABSTAIN"]'::jsonb,
  status "MotionStatus" NOT NULL DEFAULT 'OPEN',
  duration_seconds INTEGER DEFAULT 120,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.9 VOTES (Immutable vote ledger)
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  motion_id UUID NOT NULL REFERENCES public.motions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  choice "VoteChoice" NOT NULL,
  cast_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source "VoteSource" NOT NULL DEFAULT 'WEB',
  CONSTRAINT uq_vote_motion_user UNIQUE (motion_id, user_id)
);

-- =============================================================================
-- 3. SECURITY CONTEXT & HELPER FUNCTIONS
-- =============================================================================

-- 3.1 Helper: Check if current auth user is SUPERADMIN
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
      AND (r.name = 'SUPERADMIN' OR u.email = 'diegodanielalejomurillo@gmail.com')
  );
$$;

-- 3.2 Helper: Get organization ID of current authenticated user
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 4.1 ORGANIZATIONS
DROP POLICY IF EXISTS "superadmin_manage_all_organizations" ON public.organizations;
CREATE POLICY "superadmin_manage_all_organizations" ON public.organizations
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "tenant_read_own_organization" ON public.organizations;
CREATE POLICY "tenant_read_own_organization" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.current_user_org_id());

-- 4.2 ROLES & PERMISSIONS
DROP POLICY IF EXISTS "superadmin_manage_rbac" ON public.roles;
CREATE POLICY "superadmin_manage_rbac" ON public.roles
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "authenticated_read_roles" ON public.roles;
CREATE POLICY "authenticated_read_roles" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "superadmin_manage_permissions" ON public.permissions;
CREATE POLICY "superadmin_manage_permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "authenticated_read_permissions" ON public.permissions;
CREATE POLICY "authenticated_read_permissions" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "superadmin_manage_role_permissions" ON public.role_permissions;
CREATE POLICY "superadmin_manage_role_permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "authenticated_read_role_permissions" ON public.role_permissions;
CREATE POLICY "authenticated_read_role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- 4.3 USERS
DROP POLICY IF EXISTS "superadmin_manage_all_users" ON public.users;
CREATE POLICY "superadmin_manage_all_users" ON public.users
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "tenant_scoped_users_select" ON public.users;
CREATE POLICY "tenant_scoped_users_select" ON public.users
  FOR SELECT TO authenticated
  USING (organization_id = public.current_user_org_id());

DROP POLICY IF EXISTS "org_admin_manage_tenant_users" ON public.users;
CREATE POLICY "org_admin_manage_tenant_users" ON public.users
  FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_org_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name = 'ORG_ADMIN'
    )
  )
  WITH CHECK (
    organization_id = public.current_user_org_id()
  );

-- 4.4 PROPERTIES
DROP POLICY IF EXISTS "superadmin_manage_properties" ON public.properties;
CREATE POLICY "superadmin_manage_properties" ON public.properties
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "tenant_scoped_properties" ON public.properties;
CREATE POLICY "tenant_scoped_properties" ON public.properties
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

-- 4.5 MEETINGS
DROP POLICY IF EXISTS "superadmin_manage_meetings" ON public.meetings;
CREATE POLICY "superadmin_manage_meetings" ON public.meetings
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "tenant_scoped_meetings" ON public.meetings;
CREATE POLICY "tenant_scoped_meetings" ON public.meetings
  FOR ALL TO authenticated
  USING (organization_id = public.current_user_org_id())
  WITH CHECK (organization_id = public.current_user_org_id());

-- 4.6 MOTIONS
DROP POLICY IF EXISTS "superadmin_manage_motions" ON public.motions;
CREATE POLICY "superadmin_manage_motions" ON public.motions
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "tenant_scoped_motions" ON public.motions;
CREATE POLICY "tenant_scoped_motions" ON public.motions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = motions.meeting_id AND m.organization_id = public.current_user_org_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = motions.meeting_id AND m.organization_id = public.current_user_org_id()
    )
  );

-- 4.7 VOTES
DROP POLICY IF EXISTS "superadmin_manage_votes" ON public.votes;
CREATE POLICY "superadmin_manage_votes" ON public.votes
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "tenant_scoped_votes_select" ON public.votes;
CREATE POLICY "tenant_scoped_votes_select" ON public.votes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.motions mot
      JOIN public.meetings met ON mot.meeting_id = met.id
      WHERE mot.id = votes.motion_id AND met.organization_id = public.current_user_org_id()
    )
  );

DROP POLICY IF EXISTS "member_cast_own_vote" ON public.votes;
CREATE POLICY "member_cast_own_vote" ON public.votes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.motions mot
      JOIN public.meetings met ON mot.meeting_id = met.id
      WHERE mot.id = votes.motion_id
        AND met.organization_id = public.current_user_org_id()
        AND mot.status = 'OPEN'
        AND met.status = 'LIVE'
    )
  );

-- =============================================================================
-- 5. REALTIME BROADCASTING
-- =============================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.motions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
EXCEPTION WHEN others THEN null; END $$;

-- =============================================================================
-- 6. INITIAL SEED DATA (ROLES, PERMISSIONS & SUPERADMIN PROVISIONING)
-- =============================================================================

-- 6.1 ROLES
INSERT INTO public.roles (id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'SUPERADMIN', 'Global system administrator with full cross-tenant privileges'),
  ('10000000-0000-0000-0000-000000000002', 'ORG_ADMIN',  'Condominium administrator with tenant-scoped management rights'),
  ('10000000-0000-0000-0000-000000000003', 'SECRETARY',  'Assembly secretary managing meetings and transcript minutes'),
  ('10000000-0000-0000-0000-000000000004', 'MEMBER',     'Property owner or resident eligible to cast votes in assemblies')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 6.2 PERMISSIONS
INSERT INTO public.permissions (id, action, resource) VALUES
  ('20000000-0000-0000-0000-000000000001', 'MANAGE', 'ORGANIZATIONS'),
  ('20000000-0000-0000-0000-000000000002', 'MANAGE', 'ROLES'),
  ('20000000-0000-0000-0000-000000000003', 'MANAGE', 'USERS'),
  ('20000000-0000-0000-0000-000000000004', 'MANAGE', 'PROPERTIES'),
  ('20000000-0000-0000-0000-000000000005', 'MANAGE', 'MEETINGS'),
  ('20000000-0000-0000-0000-000000000006', 'MANAGE', 'MOTIONS'),
  ('20000000-0000-0000-0000-000000000007', 'VOTE',   'VOTES'),
  ('20000000-0000-0000-0000-000000000008', 'READ',   'MEETINGS')
ON CONFLICT (action, resource) DO NOTHING;

-- 6.3 ROLE_PERMISSIONS (Assign permissions to roles)
-- SUPERADMIN gets all
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000001', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- ORG_ADMIN gets tenant management
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000002', id FROM public.permissions
WHERE resource IN ('USERS', 'PROPERTIES', 'MEETINGS', 'MOTIONS', 'VOTES')
ON CONFLICT DO NOTHING;

-- MEMBER gets VOTE and READ
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '10000000-0000-0000-0000-000000000004', id FROM public.permissions
WHERE action IN ('VOTE', 'READ')
ON CONFLICT DO NOTHING;

-- 6.4 SEED DEFAULT CONDOMINIUM
INSERT INTO public.organizations (id, name, address, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Condominio Torre Bella Vista',
  'Av. Winston Churchill #45, Santo Domingo',
  '{"quorumRule": "COEFFICIENT", "threshold": 51}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;

-- 6.5 SEED GLOBAL SUPERADMIN (diegodanielalejomurillo@gmail.com)
INSERT INTO public.users (id, organization_id, role_id, full_name, email, is_active)
VALUES (
  'c280d672-dc80-442d-9744-251bfff1fc79',
  NULL, -- NULL organization_id allows Global Superadmin access across all condominiums
  '10000000-0000-0000-0000-000000000001', -- SUPERADMIN role
  'Diego Alejo Murillo (Superadmin)',
  'diegodanielalejomurillo@gmail.com',
  true
)
ON CONFLICT (id) DO UPDATE SET
  role_id = '10000000-0000-0000-0000-000000000001',
  organization_id = NULL,
  is_active = true;

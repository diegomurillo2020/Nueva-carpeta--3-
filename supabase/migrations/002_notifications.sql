-- Migration: Add notifications table, RLS policies, and enable realtime

-- =============================================================================
-- 2.12 NOTIFICATIONS (Internal in-app notifications)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_org ON public.notifications (user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id, is_read) WHERE is_read = false;


-- =============================================================================
-- 4.9 NOTIFICATIONS
-- =============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_notifications" ON public.notifications;
CREATE POLICY "select_notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    AND (organization_id = public.current_user_org_id() OR public.is_superadmin())
  );

DROP POLICY IF EXISTS "update_notifications" ON public.notifications;
CREATE POLICY "update_notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (organization_id = public.current_user_org_id() OR public.is_superadmin())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id = public.current_user_org_id() OR public.is_superadmin())
  );

DO $$ BEGIN
  
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

EXCEPTION WHEN others THEN null; END $$;

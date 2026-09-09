-- Add lifecycle status for temporary condominium suspension.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_organizations_is_active
  ON public.organizations(is_active);
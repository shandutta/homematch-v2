-- Household invitations to enable collaborator onboarding
CREATE TABLE IF NOT EXISTS public.household_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_name TEXT,
  invited_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  accepted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS household_invitations_household_idx
  ON public.household_invitations (household_id);

CREATE UNIQUE INDEX IF NOT EXISTS household_invitations_token_idx
  ON public.household_invitations (token);

ALTER TABLE public.household_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Household members can view invites" ON public.household_invitations
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Household members can create invites" ON public.household_invitations
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Household members can manage invites" ON public.household_invitations
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM public.user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Household members can delete invites" ON public.household_invitations
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

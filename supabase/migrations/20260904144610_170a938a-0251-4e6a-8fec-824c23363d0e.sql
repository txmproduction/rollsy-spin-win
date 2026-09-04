
CREATE TABLE public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid UNIQUE,
  slug text NOT NULL UNIQUE,
  company_name text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  email text NOT NULL,
  goal_type text NOT NULL DEFAULT 'google',
  goal_url text,
  status text NOT NULL DEFAULT 'pending',
  onboarding_completed boolean NOT NULL DEFAULT false,
  cgv_accepted_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.merchants TO authenticated;
GRANT SELECT ON public.merchants TO anon;
GRANT ALL ON public.merchants TO service_role;

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY merchants_owner_read ON public.merchants FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY merchants_owner_update ON public.merchants FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY merchants_owner_insert ON public.merchants FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

ALTER TABLE public.clients ADD COLUMN merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE;
ALTER TABLE public.rewards ADD COLUMN merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE;
ALTER TABLE public.spins ADD COLUMN merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE;

INSERT INTO public.merchants (slug, company_name, email, goal_type, goal_url, status, onboarding_completed, cgv_accepted_at)
VALUES ('afro-fouta', 'Afro Fouta', 'contact.afrofouta@gmail.com', 'google', 'https://g.page/r/CUpOjpZbm_0kEAE/review', 'active', true, now());

UPDATE public.clients SET merchant_id = (SELECT id FROM public.merchants WHERE slug = 'afro-fouta') WHERE merchant_id IS NULL;
UPDATE public.rewards SET merchant_id = (SELECT id FROM public.merchants WHERE slug = 'afro-fouta') WHERE merchant_id IS NULL;
UPDATE public.spins SET merchant_id = (SELECT id FROM public.merchants WHERE slug = 'afro-fouta') WHERE merchant_id IS NULL;

CREATE INDEX idx_clients_merchant ON public.clients(merchant_id);
CREATE INDEX idx_rewards_merchant ON public.rewards(merchant_id);
CREATE INDEX idx_spins_merchant ON public.spins(merchant_id);

DROP POLICY IF EXISTS rewards_public_read ON public.rewards;
CREATE POLICY rewards_public_read ON public.rewards FOR SELECT TO anon, authenticated USING (true);

-- Drop overly permissive policies
DROP POLICY IF EXISTS "rewards_open" ON public.rewards;
DROP POLICY IF EXISTS "settings_open" ON public.settings;
DROP POLICY IF EXISTS "clients_open" ON public.clients;
DROP POLICY IF EXISTS "spins_open" ON public.spins;

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spins ENABLE ROW LEVEL SECURITY;

-- Rewards: public read-only (non-sensitive catalogue), no public writes
REVOKE ALL ON public.rewards FROM anon, authenticated;
GRANT SELECT ON public.rewards TO anon, authenticated;
GRANT ALL ON public.rewards TO service_role;
CREATE POLICY "rewards_public_read" ON public.rewards FOR SELECT TO anon, authenticated USING (true);

-- Sensitive tables: no client access at all; server-side only
REVOKE ALL ON public.settings FROM anon, authenticated;
REVOKE ALL ON public.clients FROM anon, authenticated;
REVOKE ALL ON public.spins FROM anon, authenticated;
GRANT ALL ON public.settings TO service_role;
GRANT ALL ON public.clients TO service_role;
GRANT ALL ON public.spins TO service_role;
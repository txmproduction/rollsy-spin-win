CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_open" ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_label text,
  frequency text NOT NULL CHECK (frequency IN ('day','week')),
  quota int NOT NULL DEFAULT 0,
  quota_morning int,
  quota_afternoon int,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rewards TO anon, authenticated;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rewards_open" ON public.rewards FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_open" ON public.settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  reward_id uuid REFERENCES public.rewards(id) ON DELETE SET NULL,
  result text NOT NULL CHECK (result IN ('win','lose')),
  code text,
  code_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spins TO anon, authenticated;
GRANT ALL ON public.spins TO service_role;
ALTER TABLE public.spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spins_open" ON public.spins FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.rewards (name, short_label, frequency, quota, quota_morning, quota_afternoon) VALUES
  ('Kilo ailes de poulet', 'Kilo poulet', 'week', 1, NULL, NULL),
  ('Boisson offerte', 'Boisson', 'day', 2, 1, 1),
  ('Réduction 5%', '-5%', 'day', 1, NULL, NULL),
  ('Réduction 10%', '-10%', 'day', 1, NULL, NULL);
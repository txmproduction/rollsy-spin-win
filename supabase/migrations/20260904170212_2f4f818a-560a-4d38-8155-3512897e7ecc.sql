-- Profils utilisateurs avec drapeau super admin
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_self_read" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Création automatique du profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_super_admin)
  VALUES (NEW.id, NEW.email, lower(NEW.email) = 'contact.txmproduction@gmail.com')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profils pour les comptes déjà existants
INSERT INTO public.profiles (id, email, is_super_admin)
SELECT u.id, u.email, lower(u.email) = 'contact.txmproduction@gmail.com'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Fonction de vérification super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND is_super_admin = true);
$$;

-- Statut d'accès des commerçants
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS access_status text NOT NULL DEFAULT 'trial';

ALTER TABLE public.merchants
  ADD CONSTRAINT merchants_access_status_check
  CHECK (access_status IN ('trial', 'active', 'suspended'));

UPDATE public.merchants
SET access_status = 'trial'
WHERE access_status IS NULL;

UPDATE public.merchants
SET trial_ends_at = created_at + interval '14 days'
WHERE trial_ends_at IS NULL;
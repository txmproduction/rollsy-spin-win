ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS terms_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip text;

INSERT INTO public.settings (key, value) VALUES
  ('business_name', 'Afro Fouta'),
  ('business_address', ''),
  ('business_email', 'contact.afrofouta@gmail.com'),
  ('agency_name', 'TXM Production Agency'),
  ('agency_email', 'contact.txmproduction@gmail.com'),
  ('agency_address', '47 rue de Vivienne, 75002 Paris'),
  ('agency_legal', 'Capital social 1000 € — SIRET du siège social : 105 679 633 00013')
ON CONFLICT (key) DO NOTHING;
ALTER TABLE public.spins
  ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS code_used_at TIMESTAMP WITH TIME ZONE;

UPDATE public.spins
SET code_expires_at = created_at + INTERVAL '7 days'
WHERE code IS NOT NULL AND code_expires_at IS NULL;

UPDATE public.spins
SET code_used_at = created_at
WHERE code IS NOT NULL AND code_used = true AND code_used_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS spins_code_unique ON public.spins (code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS spins_merchant_code_idx ON public.spins (merchant_id, code);
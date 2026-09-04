ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS reward_mode text NOT NULL DEFAULT 'immediate';

ALTER TABLE public.merchants
  DROP CONSTRAINT IF EXISTS merchants_reward_mode_check;

ALTER TABLE public.merchants
  ADD CONSTRAINT merchants_reward_mode_check CHECK (reward_mode IN ('immediate','next_visit'));
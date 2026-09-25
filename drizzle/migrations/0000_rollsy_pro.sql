ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE public.merchants ADD CONSTRAINT merchants_plan_check CHECK (plan IN ('free','pro'));

CREATE TABLE public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  merchant_id uuid references public.merchants(id) on delete set null,
  stripe_subscription_id text not null unique,
  stripe_customer_id text not null,
  product_id text not null,
  price_id text not null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  environment text not null default 'sandbox',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscriptions read" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.crm_segments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.crm_segments TO service_role;
ALTER TABLE public.crm_segments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.campaigns (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  channel text not null check (channel in ('sms','email')),
  segment_id uuid references public.crm_segments(id) on delete set null,
  segment_name text not null,
  subject text,
  body text not null,
  recipients integer not null default 0,
  sent integer not null default 0,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
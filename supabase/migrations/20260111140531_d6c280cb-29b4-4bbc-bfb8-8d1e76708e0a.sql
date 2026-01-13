-- Add columns for free trial and withdrawal system

-- Add trial-related columns to users_matricula
ALTER TABLE public.users_matricula ADD COLUMN IF NOT EXISTS subscription_type text DEFAULT 'none';
ALTER TABLE public.users_matricula ADD COLUMN IF NOT EXISTS trial_started_at timestamp with time zone;
ALTER TABLE public.users_matricula ADD COLUMN IF NOT EXISTS trial_voice_limit_at timestamp with time zone;

-- Create affiliate_withdrawals table if not exists (check if already exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_withdrawals' AND table_schema = 'public') THEN
        CREATE TABLE public.affiliate_withdrawals (
            id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            affiliate_matricula bigint NOT NULL REFERENCES public.users_matricula(matricula) ON DELETE CASCADE,
            amount numeric NOT NULL,
            pix_key text NOT NULL,
            pix_key_type text DEFAULT 'cpf',
            status text NOT NULL DEFAULT 'pending',
            requested_at timestamp with time zone NOT NULL DEFAULT now(),
            processed_at timestamp with time zone,
            processed_by text,
            notes text,
            created_at timestamp with time zone NOT NULL DEFAULT now()
        );

        -- Enable RLS
        ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

        -- Policies for affiliate_withdrawals
        CREATE POLICY "Users can view their own withdrawals"
        ON public.affiliate_withdrawals
        FOR SELECT
        USING (true);

        CREATE POLICY "Users can create their own withdrawals"
        ON public.affiliate_withdrawals
        FOR INSERT
        WITH CHECK (true);
    END IF;
END $$;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_matricula ON public.affiliate_withdrawals(affiliate_matricula);
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_status ON public.affiliate_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_type ON public.users_matricula(subscription_type);
CREATE INDEX IF NOT EXISTS idx_users_trial_started ON public.users_matricula(trial_started_at);
-- Add fields for affiliate account control
ALTER TABLE public.users_matricula
ADD COLUMN IF NOT EXISTS is_admin_affiliate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_affiliate_created_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_affiliate_sale_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS affiliate_deactivated_at timestamp with time zone DEFAULT NULL;

-- Add pix_key_type to affiliate_withdrawals if not exists
ALTER TABLE public.affiliate_withdrawals
ADD COLUMN IF NOT EXISTS pix_key_type text DEFAULT 'cpf';

-- Create index for efficient querying of inactive affiliates
CREATE INDEX IF NOT EXISTS idx_users_admin_affiliate ON public.users_matricula (is_admin_affiliate, admin_affiliate_created_at) WHERE is_admin_affiliate = true;

-- Create index for affiliate sales tracking
CREATE INDEX IF NOT EXISTS idx_users_affiliate_sale ON public.users_matricula (last_affiliate_sale_at) WHERE is_affiliate = true;
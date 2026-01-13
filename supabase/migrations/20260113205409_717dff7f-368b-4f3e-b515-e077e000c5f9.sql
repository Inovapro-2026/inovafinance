-- Add column to store if user should be activated as affiliate
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS activate_affiliate_mode boolean DEFAULT false;

-- Add column to store admin affiliate link code used
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS admin_affiliate_link_code text DEFAULT null;
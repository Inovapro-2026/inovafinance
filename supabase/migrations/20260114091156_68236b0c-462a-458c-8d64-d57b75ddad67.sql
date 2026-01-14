-- Add the missing admin_affiliate_link_code column to users_matricula
ALTER TABLE public.users_matricula 
ADD COLUMN IF NOT EXISTS admin_affiliate_link_code TEXT;
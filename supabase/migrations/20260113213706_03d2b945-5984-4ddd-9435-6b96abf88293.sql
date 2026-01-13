-- Add PIX key columns to users_matricula for affiliate payment
ALTER TABLE public.users_matricula 
ADD COLUMN IF NOT EXISTS pix_key text,
ADD COLUMN IF NOT EXISTS pix_key_type text DEFAULT 'cpf';
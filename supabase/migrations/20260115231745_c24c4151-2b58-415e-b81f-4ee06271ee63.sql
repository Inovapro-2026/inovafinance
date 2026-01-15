-- Add initial_balance and current_credit_used columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS initial_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_credit_used numeric DEFAULT 0;
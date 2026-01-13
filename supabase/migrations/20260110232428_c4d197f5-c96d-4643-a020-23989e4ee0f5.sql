-- Create payments table to track Mercado Pago transactions
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_temp_id TEXT NOT NULL,
  matricula INTEGER,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  amount NUMERIC NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_provider TEXT NOT NULL DEFAULT 'mercadopago',
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  affiliate_code INTEGER,
  has_credit_card BOOLEAN DEFAULT false,
  credit_limit NUMERIC DEFAULT 0,
  credit_due_day INTEGER DEFAULT 5,
  salary_amount NUMERIC DEFAULT 0,
  salary_day INTEGER DEFAULT 5,
  advance_amount NUMERIC DEFAULT 0,
  advance_day INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies for payments table
CREATE POLICY "Allow public insert for payments"
ON public.payments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public select for payments by temp_id"
ON public.payments
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all payments"
ON public.payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_payments_user_temp_id ON public.payments(user_temp_id);
CREATE INDEX idx_payments_mp_preference_id ON public.payments(mp_preference_id);
CREATE INDEX idx_payments_mp_payment_id ON public.payments(mp_payment_id);
CREATE INDEX idx_payments_payment_status ON public.payments(payment_status);
-- Tabela para solicitações de saque de afiliados
CREATE TABLE IF NOT EXISTS public.affiliate_withdrawals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_matricula integer NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, paid, cancelled
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid,
  pix_key text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Adicionar coluna affiliate_balance na tabela users_matricula
ALTER TABLE public.users_matricula 
ADD COLUMN IF NOT EXISTS affiliate_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_affiliate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS affiliate_code text;

-- Índices
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_status ON public.affiliate_withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_matricula ON public.affiliate_withdrawals(affiliate_matricula);
CREATE INDEX IF NOT EXISTS idx_users_matricula_affiliate ON public.users_matricula(is_affiliate) WHERE is_affiliate = true;

-- Enable RLS
ALTER TABLE public.affiliate_withdrawals ENABLE ROW LEVEL SECURITY;

-- Policies para affiliate_withdrawals
CREATE POLICY "Admins can manage all withdrawals" 
ON public.affiliate_withdrawals 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own withdrawals" 
ON public.affiliate_withdrawals 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM users_matricula 
  WHERE users_matricula.matricula = affiliate_withdrawals.affiliate_matricula 
    AND users_matricula.id = auth.uid()
));

CREATE POLICY "Users can request withdrawals" 
ON public.affiliate_withdrawals 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM users_matricula 
  WHERE users_matricula.matricula = affiliate_withdrawals.affiliate_matricula 
    AND users_matricula.id = auth.uid()
));

-- Inserir configurações padrão de sistema para afiliados (se não existirem)
INSERT INTO public.system_settings (key, value) 
VALUES 
  ('affiliate_commission_type', 'percentage'),
  ('affiliate_commission_value', '30'),
  ('affiliate_min_withdrawal', '40')
ON CONFLICT (key) DO NOTHING;
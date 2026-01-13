-- Create discount_coupons table
CREATE TABLE public.discount_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_limit INTEGER DEFAULT NULL,
  times_used INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

-- Admin can manage coupons
CREATE POLICY "Admins can manage coupons" 
ON public.discount_coupons 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public can read active coupons (for validation)
CREATE POLICY "Public can validate coupons" 
ON public.discount_coupons 
FOR SELECT 
USING (is_active = true);

-- Add subscription_price to system_settings if not exists
INSERT INTO public.system_settings (key, value)
VALUES ('subscription_price', '49.99')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value)
VALUES ('affiliate_price', '29.99')
ON CONFLICT (key) DO NOTHING;

-- Create index for coupon code lookup
CREATE INDEX idx_discount_coupons_code ON public.discount_coupons(code);
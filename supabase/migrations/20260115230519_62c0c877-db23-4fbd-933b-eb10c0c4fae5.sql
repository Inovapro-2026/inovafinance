UPDATE public.system_settings
SET value = '19.90', updated_at = now()
WHERE key = 'subscription_price';

INSERT INTO public.system_settings (key, value)
SELECT 'subscription_price', '19.90'
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings WHERE key = 'subscription_price');
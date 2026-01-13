import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Sparkles, ArrowRight, User, Phone, Mail, FileText, Wallet, Calendar, ChevronLeft, Loader2, CheckCircle2, AlertCircle, Copy, Check, QrCode, Clock, Tag, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GlassCard } from '@/components/ui/GlassCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Step = 'form' | 'processing' | 'pix' | 'success' | 'error' | 'trial_success';

interface PixData {
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expirationDate: string | null;
}

const SUPABASE_URL = "https://pahvovxnhqsmcnqncmys.supabase.co";

export default function Subscribe() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [hasCreditCard, setHasCreditCard] = useState(false);
  const [creditLimit, setCreditLimit] = useState('');
  const [creditDueDay, setCreditDueDay] = useState('5');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryDay, setSalaryDay] = useState('5');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDay, setAdvanceDay] = useState('');

  // Coupon code
  const [couponCode, setCouponCode] = useState('');
  const [couponValidated, setCouponValidated] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Affiliate code from URL or manual input
  const [affiliateCode, setAffiliateCode] = useState<number | null>(null);
  const [affiliateName, setAffiliateName] = useState<string | null>(null);
  const [affiliateFromUrl, setAffiliateFromUrl] = useState(false);
  const [manualAffiliateCode, setManualAffiliateCode] = useState('');
  const [isValidatingAffiliate, setIsValidatingAffiliate] = useState(false);

  // Trial mode detection
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [trialMatricula, setTrialMatricula] = useState<string | null>(null);
  
  // Admin affiliate link (auto-activate affiliate mode for new user)
  const [isAdminAffiliateLink, setIsAdminAffiliateLink] = useState(false);
  const [adminAffiliateLinkCode, setAdminAffiliateLinkCode] = useState<string | null>(null);
  
  // PIX key for affiliates
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'email' | 'phone' | 'random'>('cpf');

  // Payment info
  const [basePrice, setBasePrice] = useState(49.99);
  const [affiliatePrice, setAffiliatePrice] = useState(29.99);
  const [subscriptionAmount, setSubscriptionAmount] = useState(49.99);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [userTempId, setUserTempId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    // Check if trial mode
    const trial = searchParams.get('trial');
    if (trial === 'true') {
      setIsTrialMode(true);
    }

    // Load prices from system settings (only needed for paid mode)
    const loadPrices = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['subscription_price', 'affiliate_price']);

      data?.forEach((s) => {
        if (s.key === 'subscription_price' && s.value) {
          setBasePrice(parseFloat(s.value));
          setSubscriptionAmount(parseFloat(s.value));
        }
        if (s.key === 'affiliate_price' && s.value) {
          setAffiliatePrice(parseFloat(s.value));
        }
      });
    };
    if (!trial) {
      loadPrices();
    }

    const rawCode =
      searchParams.get('ref') ||
      searchParams.get('affiliate') ||
      searchParams.get('code') ||
      searchParams.get('invite') ||
      searchParams.get('inv');

    const code = rawCode ? decodeURIComponent(rawCode).trim() : null;

    if (code) {
      // Save ref to localStorage for persistence
      localStorage.setItem('inovafinance_affiliate_ref', code);

      // Check if it's an admin-generated link (AFI-xxx or INV-xxx format)
      if (code.startsWith('AFI-') || code.startsWith('INV-')) {
        setAffiliateFromUrl(true);
        setManualAffiliateCode(code);
        validateAdminAffiliateLink(code);
      } else {
        // Regular user affiliate code (matricula)
        const numCode = parseInt(code, 10);
        if (!isNaN(numCode)) {
          setAffiliateFromUrl(true);
          setManualAffiliateCode(code);
          validateAffiliateCode(numCode, true);
        }
      }
    } else {
      // Check localStorage for saved affiliate ref
      const savedRef = localStorage.getItem('inovafinance_affiliate_ref');
      if (savedRef) {
        if (savedRef.startsWith('AFI-') || savedRef.startsWith('INV-')) {
          setAffiliateFromUrl(true);
          setManualAffiliateCode(savedRef);
          validateAdminAffiliateLink(savedRef);
        } else {
          const numCode = parseInt(savedRef, 10);
          if (!isNaN(numCode)) {
            setAffiliateFromUrl(true);
            setManualAffiliateCode(savedRef);
            validateAffiliateCode(numCode, true);
          }
        }
      }
    }
  }, [searchParams]);

  // Poll for payment status when showing PIX
  useEffect(() => {
    if (step === 'pix' && userTempId) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/check-payment-status?temp_id=${userTempId}`);
          const data = await response.json();

          if (data.payment?.payment_status === 'approved') {
            setStep('success');
            clearInterval(interval);
          }
        } catch (e) {
          console.error('Error checking payment status:', e);
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [step, userTempId]);

  const validateAffiliateCode = async (code: number, fromUrl: boolean = false) => {
    setIsValidatingAffiliate(true);
    try {
      const { data, error } = await supabase
        .from('users_matricula')
        .select('matricula, full_name, user_status')
        .eq('matricula', code)
        .eq('user_status', 'approved')
        .single();

      if (data && !error) {
        setAffiliateCode(data.matricula);
        setAffiliateName(data.full_name);
        setAffiliateFromUrl(fromUrl);
        const newAmount = affiliatePrice - couponDiscount;
        setSubscriptionAmount(Math.max(0.01, newAmount));
        toast({
          title: "Código de indicação válido!",
          description: `Você foi indicado por ${data.full_name}. Valor promocional aplicado!`,
        });
      } else {
        if (!fromUrl) {
          toast({
            title: "Código inválido",
            description: "Este código de indicação não existe ou não está ativo.",
            variant: "destructive"
          });
        }
        setAffiliateCode(null);
        setAffiliateName(null);
      }
    } catch (e) {
      console.log('Affiliate code not valid');
      if (!fromUrl) {
        toast({
          title: "Código inválido",
          description: "Este código de indicação não existe ou não está ativo.",
          variant: "destructive"
        });
      }
    }
    setIsValidatingAffiliate(false);
  };

  // Validate admin-generated affiliate links (AFI-xxx format)
  const validateAdminAffiliateLink = async (code: string) => {
    setIsValidatingAffiliate(true);
    try {
      // Check if link exists in system_settings
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'affiliate_links')
        .single();

      if (data?.value) {
        const links = JSON.parse(data.value);
        const link = links.find((l: any) => 
          l.affiliate_code === code && 
          l.is_active && 
          !l.is_blocked
        );

        if (link) {
          setIsAdminAffiliateLink(true);
          setAdminAffiliateLinkCode(code);
          // Use affiliate name if available, otherwise show generic partner message
          const partnerName = link.affiliate_name || 'um parceiro INOVAFINANCE';
          setAffiliateName(partnerName);
          // Admin affiliate accounts are FREE (no PIX payment)
          setSubscriptionAmount(0);
          toast({
            title: "Você foi indicado por um parceiro INOVAFINANCE",
            description: `Indicado por: ${partnerName}. Ao se cadastrar, você terá acesso ao programa de afiliados.`,
          });
        } else {
          toast({
            title: "Link inválido",
            description: "Este link de afiliado não existe, está inativo ou bloqueado.",
            variant: "destructive"
          });
        }
      }
    } catch (e) {
      console.error('Error validating admin affiliate link:', e);
    }
    setIsValidatingAffiliate(false);
  };

  const handleValidateManualAffiliate = () => {
    const code = parseInt(manualAffiliateCode, 10);
    if (!isNaN(code) && code > 0) {
      validateAffiliateCode(code, false);
    } else {
      toast({
        title: "Código inválido",
        description: "Digite um código de indicação válido.",
        variant: "destructive"
      });
    }
  };

  const clearAffiliateCode = () => {
    setAffiliateCode(null);
    setAffiliateName(null);
    setManualAffiliateCode('');
    setAffiliateFromUrl(false);
    const newAmount = basePrice - couponDiscount;
    setSubscriptionAmount(Math.max(0.01, newAmount));
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsValidatingCoupon(true);

    try {
      const { data: coupon, error } = await supabase
        .from('discount_coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !coupon) {
        toast({
          title: "Cupom inválido",
          description: "Este cupom não existe ou está inativo.",
          variant: "destructive"
        });
        setCouponValidated(false);
        setCouponDiscount(0);
        setIsValidatingCoupon(false);
        return;
      }

      // Check expiration
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        toast({
          title: "Cupom expirado",
          description: "Este cupom já expirou.",
          variant: "destructive"
        });
        setCouponValidated(false);
        setCouponDiscount(0);
        setIsValidatingCoupon(false);
        return;
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
        toast({
          title: "Cupom esgotado",
          description: "Este cupom atingiu o limite de uso.",
          variant: "destructive"
        });
        setCouponValidated(false);
        setCouponDiscount(0);
        setIsValidatingCoupon(false);
        return;
      }

      // Calculate discount
      const currentBase = affiliateCode ? affiliatePrice : basePrice;
      let discount = 0;

      if (coupon.discount_type === 'percentage') {
        discount = (currentBase * coupon.discount_value) / 100;
      } else {
        discount = coupon.discount_value;
      }

      setCouponDiscount(discount);
      setCouponValidated(true);
      setSubscriptionAmount(Math.max(0.01, currentBase - discount));

      toast({
        title: "Cupom aplicado!",
        description: `Desconto de R$ ${discount.toFixed(2).replace('.', ',')} aplicado.`,
      });
    } catch (e) {
      console.error('Error validating coupon:', e);
    }

    setIsValidatingCoupon(false);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers) {
      const amount = parseInt(numbers) / 100;
      return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '';
  };

  const parseCurrency = (value: string): number => {
    const numbers = value.replace(/\D/g, '');
    return numbers ? parseInt(numbers) / 100 : 0;
  };

  const copyPixCode = async () => {
    if (pixData?.qrCode) {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no seu aplicativo do banco para pagar",
      });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Generate unique matricula
  const generateMatricula = async (): Promise<number> => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const newMatricula = Math.floor(100000 + Math.random() * 900000);

      const { data } = await supabase
        .from('users_matricula')
        .select('matricula')
        .eq('matricula', newMatricula)
        .maybeSingle();

      if (!data) {
        return newMatricula;
      }
      attempts++;
    }

    throw new Error('Não foi possível gerar matrícula única');
  };

  // Handle FREE TRIAL registration (no payment)
  const handleTrialSignup = async () => {
    // Validate fields
    if (!fullName.trim()) {
      setError('Nome completo é obrigatório');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Telefone válido é obrigatório');
      return;
    }
    if (!cpf.trim() || cpf.replace(/\D/g, '').length !== 11) {
      setError('CPF válido é obrigatório');
      return;
    }
    
    // Validate PIX key for affiliate links
    if (isAdminAffiliateLink && !pixKey.trim()) {
      setError('Chave PIX é obrigatória para afiliados');
      return;
    }

    setError('');
    setIsLoading(true);
    setStep('processing');

    try {
      // Generate unique matricula
      const newMatricula = await generateMatricula();
      const now = new Date().toISOString();
      const voiceLimitAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
      const trialEndDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

      // Create user with FREE_TRIAL status for admin affiliates (no subscription required)
      // If coming from admin affiliate link, activate affiliate mode with PIX key
      // Admin affiliates don't pay - account is free but deactivates in 7 days without sales
      const { error: insertError } = await supabase
        .from('users_matricula')
        .insert({
          matricula: newMatricula,
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim(),
          cpf: cpf.replace(/\D/g, ''),
          initial_balance: 0,
          has_credit_card: hasCreditCard,
          credit_limit: hasCreditCard ? parseCurrency(creditLimit) : 0,
          credit_due_day: hasCreditCard ? parseInt(creditDueDay) : 5,
          salary_amount: parseCurrency(salaryAmount),
          salary_day: parseInt(salaryDay) || 5,
          advance_amount: parseCurrency(advanceAmount),
          advance_day: advanceDay ? parseInt(advanceDay) : null,
          user_status: 'approved', // Auto-approved for affiliate
          blocked: false,
          // Admin affiliates get permanent access (no subscription needed)
          subscription_type: isAdminAffiliateLink ? 'AFFILIATE_FREE' : 'FREE_TRIAL',
          subscription_status: isAdminAffiliateLink ? 'active' : 'trial',
          trial_started_at: isAdminAffiliateLink ? null : now,
          trial_voice_limit_at: isAdminAffiliateLink ? null : voiceLimitAt,
          subscription_start_date: now,
          subscription_end_date: isAdminAffiliateLink ? null : trialEndDate, // No end date for affiliates
          // Activate affiliate mode if coming from admin link
          is_affiliate: isAdminAffiliateLink,
          affiliate_code: isAdminAffiliateLink ? newMatricula.toString() : null,
          affiliate_balance: 0,
          // Save PIX key for affiliate payouts
          pix_key: isAdminAffiliateLink ? pixKey.trim() : null,
          pix_key_type: isAdminAffiliateLink ? pixKeyType : null,
          // Mark as admin-created affiliate for 7-day rule tracking
          is_admin_affiliate: isAdminAffiliateLink,
          admin_affiliate_created_at: isAdminAffiliateLink ? now : null,
          last_affiliate_sale_at: null,
          affiliate_deactivated_at: null,
        } as any);

      if (insertError) throw insertError;

      // If affiliate code, record the invite (pending - will be approved when they pay)
      if (affiliateCode) {
        await supabase
          .from('affiliate_invites')
          .insert({
            inviter_matricula: affiliateCode,
            invited_matricula: newMatricula,
            status: 'pending'
          });
      }

      setTrialMatricula(newMatricula.toString());
      setStep('trial_success');
      setIsLoading(false);

    } catch (err: any) {
      console.error('Trial registration error:', err);
      setError(err.message || 'Erro ao criar conta');
      setStep('form');
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    // Validate fields
    if (!fullName.trim()) {
      setError('Nome completo é obrigatório');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Telefone válido é obrigatório');
      return;
    }
    if (!cpf.trim() || cpf.replace(/\D/g, '').length !== 11) {
      setError('CPF válido é obrigatório');
      return;
    }
    
    // Validate PIX key for affiliate links
    if (isAdminAffiliateLink && !pixKey.trim()) {
      setError('Chave PIX é obrigatória para afiliados');
      return;
    }

    setError('');
    setIsLoading(true);
    setStep('processing');

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-pix-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim(),
          cpf: cpf.trim(),
          hasCreditCard,
          creditLimit: hasCreditCard ? parseCurrency(creditLimit) : 0,
          creditDueDay: hasCreditCard ? parseInt(creditDueDay) : 5,
          salaryAmount: parseCurrency(salaryAmount),
          salaryDay: parseInt(salaryDay) || 5,
          advanceAmount: parseCurrency(advanceAmount),
          advanceDay: advanceDay ? parseInt(advanceDay) : null,
          affiliateCode: affiliateCode,
          couponCode: couponValidated ? couponCode.toUpperCase().trim() : null,
          // Flag to activate affiliate mode for new user
          activateAffiliateMode: isAdminAffiliateLink,
          adminAffiliateLinkCode: adminAffiliateLinkCode,
          // PIX key for affiliate payouts
          pixKey: isAdminAffiliateLink ? pixKey.trim() : null,
          pixKeyType: isAdminAffiliateLink ? pixKeyType : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar pagamento PIX');
      }

      // Store data
      setPixData(data.pix);
      setUserTempId(data.userTempId);
      setPaymentId(data.paymentId);
      sessionStorage.setItem('payment_temp_id', data.userTempId);

      setStep('pix');
      setIsLoading(false);

    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Erro ao processar assinatura');
      setStep('error');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Header */}
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`w-20 h-20 ${isTrialMode ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-primary to-accent'} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}
                >
                  {isTrialMode ? (
                    <Clock className="w-10 h-10 text-white" />
                  ) : (
                    <Sparkles className="w-10 h-10 text-primary-foreground" />
                  )}
                </motion.div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isTrialMode ? 'Teste Grátis' : 'INOVAFINANCE'}
                </h1>
                <p className="text-muted-foreground mt-2">
                  {isTrialMode ? '24 horas de acesso completo ao INOVAFINANCE' : 'Sua conta financeira inteligente'}
                </p>
              </div>

              {/* Trial Benefits Banner */}
              {isTrialMode && (
                <GlassCard className="p-4 mb-6 bg-gradient-to-r from-emerald-500/10 to-primary/10 border-emerald-500/20">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">✨ Inclui voz natural ISA por 2 horas</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Após 2h, a voz muda para síntese do navegador. Assine para manter a voz premium!
                      </p>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Admin Affiliate Link Badge - Prominent message for affiliate registration */}
              {isAdminAffiliateLink && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mb-6"
                >
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500/20 via-primary/20 to-purple-500/20 border-2 border-purple-500/40 p-5">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
                    <div className="relative flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-bold text-white">
                          🎉 Você foi indicado por um parceiro INOVAFINANCE
                        </p>
                        <p className="text-sm text-purple-200 mt-1">
                          Ao se cadastrar, você terá acesso ao <span className="font-bold text-purple-300">programa de afiliados</span> com comissão de 50%!
                        </p>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Regular Affiliate badge - Elegant referral message */}
              {affiliateCode && !isAdminAffiliateLink && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mb-6"
                >
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 p-4">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
                    <div className="relative flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                        <Sparkles className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">
                          Você foi indicado por um parceiro INOVAFINANCE
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Obrigado por fazer parte da nossa comunidade!
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Price card - hide in trial mode, show FREE for admin affiliates */}
              {!isTrialMode && (
                <GlassCard className="p-6 mb-6">
                  {isAdminAffiliateLink ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Conta de Afiliado</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-emerald-400">GRÁTIS</span>
                            <span className="text-sm text-muted-foreground line-through">R$ 49,99</span>
                          </div>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                          <Users className="w-7 h-7 text-white" />
                        </div>
                      </div>
                      <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Sem mensalidade • Ganhe 50% de comissão por indicação
                      </p>
                      <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-xs text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="font-semibold">Importante:</span> Faça sua primeira venda em 7 dias para manter a conta ativa
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Assinatura mensal</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold">R$ {subscriptionAmount.toFixed(2).replace('.', ',')}</span>
                            {affiliateCode && (
                              <span className="text-sm text-muted-foreground line-through">R$ 49,99</span>
                            )}
                          </div>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                          <QrCode className="w-7 h-7 text-primary-foreground" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                        <QrCode className="w-3 h-3" />
                        Pagamento via PIX - Aprovação instantânea
                      </p>
                    </>
                  )}
                </GlassCard>
              )}

              {/* Form */}
              <GlassCard className="p-6">
                <div className="space-y-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <span className="text-sm text-destructive">{error}</span>
                    </motion.div>
                  )}

                  {/* Name */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nome completo *
                    </Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="bg-background/50"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      E-mail (opcional)
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="bg-background/50"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Telefone *
                    </Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className="bg-background/50"
                    />
                  </div>

                  {/* CPF */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      CPF *
                    </Label>
                    <Input
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="bg-background/50"
                    />
                  </div>

                  {/* PIX Key for Affiliate Registration */}
                  {isAdminAffiliateLink && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 p-4 bg-gradient-to-r from-purple-500/10 to-primary/10 rounded-xl border border-purple-500/20"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-5 h-5 text-purple-400" />
                        <span className="text-sm font-bold text-purple-300">Dados para receber comissões</span>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Tipo de chave PIX *</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: 'cpf', label: 'CPF' },
                            { value: 'email', label: 'E-mail' },
                            { value: 'phone', label: 'Telefone' },
                            { value: 'random', label: 'Aleatória' },
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setPixKeyType(option.value as any)}
                              className={`p-2 rounded-lg text-sm font-medium transition-all ${
                                pixKeyType === option.value
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-background/50 text-muted-foreground hover:bg-background/70'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm text-slate-300">Chave PIX *</Label>
                        <Input
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                          placeholder={
                            pixKeyType === 'cpf' ? '000.000.000-00' :
                            pixKeyType === 'email' ? 'seu@email.com' :
                            pixKeyType === 'phone' ? '(00) 00000-0000' :
                            'Chave aleatória'
                          }
                          className="bg-background/50"
                        />
                        <p className="text-xs text-purple-300/70">
                          Esta chave será usada para receber suas comissões de 50% por indicação.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Salário
                      </Label>
                      <Input
                        value={salaryAmount}
                        onChange={(e) => setSalaryAmount(formatCurrency(e.target.value))}
                        placeholder="0,00"
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Dia pagamento
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={salaryDay}
                        onChange={(e) => setSalaryDay(e.target.value)}
                        className="bg-background/50"
                      />
                    </div>
                  </div>

                  {/* Credit card toggle */}
                  <div className="flex items-center justify-between p-3 bg-background/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <span className="text-sm">Simular cartão de crédito</span>
                    </div>
                    <Switch
                      checked={hasCreditCard}
                      onCheckedChange={setHasCreditCard}
                    />
                  </div>

                  {/* Credit card fields */}
                  <AnimatePresence>
                    {hasCreditCard && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="grid grid-cols-2 gap-3"
                      >
                        <div className="space-y-2">
                          <Label>Limite</Label>
                          <Input
                            value={creditLimit}
                            onChange={(e) => setCreditLimit(formatCurrency(e.target.value))}
                            placeholder="0,00"
                            className="bg-background/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Dia vencimento</Label>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            value={creditDueDay}
                            onChange={(e) => setCreditDueDay(e.target.value)}
                            className="bg-background/50"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Affiliate Code Manual Input - hide in trial mode */}
                  {!isTrialMode && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Código de Indicação (opcional)
                    </Label>
                    {affiliateCode ? (
                      <div className="p-3 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium">
                              Indicado por {affiliateName || `Matrícula ${affiliateCode}`}
                            </span>
                          </div>
                          {!affiliateFromUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearAffiliateCode}
                              className="text-xs h-7"
                            >
                              Remover
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Você foi indicado por um parceiro INOVAFINANCE
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={manualAffiliateCode}
                          onChange={(e) => setManualAffiliateCode(e.target.value)}
                          placeholder="Digite o código de indicação"
                          className="bg-background/50"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleValidateManualAffiliate}
                          disabled={isValidatingAffiliate || !manualAffiliateCode.trim()}
                          className="shrink-0"
                        >
                          {isValidatingAffiliate ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Aplicar'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  )}

                  {/* Coupon code - hide in trial mode */}
                  {!isTrialMode && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Cupom de Desconto (opcional)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponValidated(false);
                        }}
                        placeholder="PROMO10"
                        className="bg-background/50 uppercase"
                        disabled={couponValidated}
                      />
                      <Button
                        type="button"
                        variant={couponValidated ? "secondary" : "outline"}
                        onClick={couponValidated ? () => {
                          setCouponCode('');
                          setCouponValidated(false);
                          setCouponDiscount(0);
                          const currentBase = affiliateCode ? affiliatePrice : basePrice;
                          setSubscriptionAmount(currentBase);
                        } : validateCoupon}
                        disabled={isValidatingCoupon || (!couponCode.trim() && !couponValidated)}
                        className="shrink-0"
                      >
                        {isValidatingCoupon ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : couponValidated ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" />
                            Remover
                          </>
                        ) : (
                          'Aplicar'
                        )}
                      </Button>
                    </div>
                    {couponValidated && (
                      <p className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Desconto de R$ {couponDiscount.toFixed(2).replace('.', ',')} aplicado!
                      </p>
                    )}
                  </div>
                  )}

                  {/* Subscribe button - changes based on trial mode or admin affiliate */}
                  <Button
                    onClick={(isTrialMode || isAdminAffiliateLink) ? handleTrialSignup : handleSubscribe}
                    disabled={isLoading}
                    className={`w-full h-14 text-lg font-semibold ${(isTrialMode || isAdminAffiliateLink) ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-primary to-accent'} hover:opacity-90 transition-opacity mt-4`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isTrialMode ? (
                      <>
                        <Clock className="w-5 h-5 mr-2" />
                        Criar conta grátis
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    ) : isAdminAffiliateLink ? (
                      <>
                        <Users className="w-5 h-5 mr-2" />
                        Criar conta de afiliado
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    ) : (
                      <>
                        <QrCode className="w-5 h-5 mr-2" />
                        Gerar PIX - R$ {subscriptionAmount.toFixed(2).replace('.', ',')}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  {/* Login link */}
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    Já tem uma conta?{' '}
                    <button
                      onClick={() => navigate('/login')}
                      className="text-primary hover:underline"
                    >
                      Fazer login
                    </button>
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <GlassCard className="p-8">
                <Loader2 className={`w-16 h-16 ${isTrialMode ? 'text-emerald-500' : 'text-primary'} animate-spin mx-auto mb-4`} />
                <h2 className="text-xl font-bold mb-2">{isTrialMode ? 'Criando sua conta...' : 'Gerando PIX...'}</h2>
                <p className="text-muted-foreground">
                  {isTrialMode ? 'Aguarde enquanto ativamos seu teste grátis' : 'Aguarde enquanto geramos seu QR Code'}
                </p>
              </GlassCard>
            </motion.div>
          )}

          {step === 'pix' && pixData && (
            <motion.div
              key="pix"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <QrCode className="w-8 h-8 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold">Pague com PIX</h1>
                <p className="text-muted-foreground mt-1">
                  Escaneie o QR Code ou copie o código
                </p>
              </div>

              {/* QR Code Card */}
              <GlassCard className="p-6 mb-4">
                {/* Amount */}
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground">Valor a pagar</p>
                  <p className="text-3xl font-bold text-primary">
                    R$ {subscriptionAmount.toFixed(2).replace('.', ',')}
                  </p>
                </div>

                {/* QR Code Image */}
                {pixData.qrCodeBase64 && (
                  <div className="flex justify-center mb-6">
                    <div className="bg-white p-4 rounded-2xl shadow-lg">
                      <img
                        src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                        alt="QR Code PIX"
                        className="w-48 h-48"
                      />
                    </div>
                  </div>
                )}

                {/* Copy code button */}
                {pixData.qrCode && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground text-center">
                      Ou copie o código PIX:
                    </p>
                    <div className="relative">
                      <div className="bg-muted/50 p-3 rounded-lg text-xs font-mono break-all max-h-20 overflow-y-auto">
                        {pixData.qrCode}
                      </div>
                    </div>
                    <Button
                      onClick={copyPixCode}
                      variant="outline"
                      className="w-full"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-500" />
                          Código copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar código PIX
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </GlassCard>

              {/* Status info */}
              <GlassCard className="p-4 mb-4 border-amber-500/30 bg-amber-500/10">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Aguardando pagamento</p>
                    <p className="text-xs text-muted-foreground">
                      Assim que o pagamento for confirmado, você será redirecionado automaticamente
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Back button */}
              <Button
                onClick={() => {
                  setStep('form');
                  setPixData(null);
                }}
                variant="ghost"
                className="w-full"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar e alterar dados
              </Button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <GlassCard className="p-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Pagamento confirmado!</h2>
                <p className="text-muted-foreground mb-6">
                  Seu cadastro foi realizado com sucesso. Aguarde a aprovação do administrador para receber sua matrícula por WhatsApp.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-primary to-accent"
                >
                  Ir para o Login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </GlassCard>
            </motion.div>
          )}

          {step === 'trial_success' && (
            <motion.div
              key="trial_success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <GlassCard className="p-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Conta criada com sucesso!</h2>
                <p className="text-muted-foreground mb-4">
                  Seu teste grátis de 24 horas está ativo.
                </p>
                {trialMatricula && (
                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <p className="text-sm text-muted-foreground">Sua matrícula:</p>
                    <p className="text-3xl font-bold text-primary">{trialMatricula}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Anote esta matrícula para fazer login
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span>Voz premium ISA por 2 horas</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Acesso completo por 24 horas</span>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 mt-6"
                >
                  Ir para o Login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </GlassCard>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <GlassCard className="p-8">
                <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-xl font-bold mb-2">{isTrialMode ? 'Erro ao criar conta' : 'Erro no pagamento'}</h2>
                <p className="text-muted-foreground mb-6">{error}</p>
                <Button
                  onClick={() => setStep('form')}
                  variant="outline"
                  className="w-full"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Tentar novamente
                </Button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Sparkles, ArrowRight, User, Phone, Mail, FileText, Wallet, Calendar, ChevronLeft, Loader2, CheckCircle2, AlertCircle, Copy, Check, QrCode, Clock, Tag, Users, ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { GlassCard } from '@/components/ui/GlassCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { speakNative, stopNativeSpeaking } from '@/services/nativeTtsService';

type Step = 'form' | 'processing' | 'pix' | 'success' | 'error' | 'trial_success';
type FormStep = 'name' | 'email' | 'phone' | 'cpf' | 'salary' | 'balances' | 'creditCard' | 'affiliate' | 'coupon' | 'pixKey' | 'review';

interface PixData {
  qrCode: string | null;
  qrCodeBase64: string | null;
  ticketUrl: string | null;
  expirationDate: string | null;
}

const SUPABASE_URL = "https://pahvovxnhqsmcnqncmys.supabase.co";

// Step voice explanations
const STEP_EXPLANATIONS: Record<FormStep, string> = {
  name: 'Vamos começar! Digite seu nome completo. Este será usado para identificar sua conta.',
  email: 'Agora digite seu e-mail. Este campo é opcional, mas recomendamos preencher para recuperação de conta.',
  phone: 'Digite seu número de telefone com DDD. Usaremos para contato importante sobre sua conta.',
  cpf: 'Agora digite seu CPF. Este documento é necessário para verificação de identidade.',
  salary: 'Informe seu salário mensal e o dia do pagamento. Isso nos ajuda a organizar seu planejamento financeiro.',
  balances: 'Informe seu saldo atual em conta débito e crédito. Isso nos ajuda a calcular seu saldo total.',
  creditCard: 'Você possui cartão de crédito? Se sim, ative a opção e informe o limite e dia de vencimento.',
  affiliate: 'Tem um código de indicação? Digite aqui para ganhar desconto especial.',
  coupon: 'Possui cupom de desconto? Digite o código para aplicar.',
  pixKey: 'Como afiliado, você receberá comissões. Informe sua chave PIX para receber os pagamentos.',
  review: 'Revise seus dados antes de finalizar. Confira se todas as informações estão corretas.'
};

export default function Subscribe() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('form');
  const [formStep, setFormStep] = useState<FormStep>('name');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [hasSpokenCurrentStep, setHasSpokenCurrentStep] = useState(false);

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
  
  // Current balances
  const [currentDebitBalance, setCurrentDebitBalance] = useState('');
  const [currentCreditBalance, setCurrentCreditBalance] = useState('');

  // Real-time validation states
  const [cpfValidation, setCpfValidation] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid' | 'duplicate'; message: string }>({ status: 'idle', message: '' });
  const [phoneValidation, setPhoneValidation] = useState<{ status: 'idle' | 'checking' | 'valid' | 'duplicate'; message: string }>({ status: 'idle', message: '' });
  const [emailValidation, setEmailValidation] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid' | 'duplicate'; message: string }>({ status: 'idle', message: '' });

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
  const [basePrice, setBasePrice] = useState(19.90);
  const [affiliatePrice, setAffiliatePrice] = useState(29.99);
  const [subscriptionAmount, setSubscriptionAmount] = useState(19.90);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [userTempId, setUserTempId] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [confirmedMatricula, setConfirmedMatricula] = useState<string | null>(null);

  // Speak the current step explanation
  const speakStepExplanation = useCallback((currentStep: FormStep) => {
    const explanation = STEP_EXPLANATIONS[currentStep];
    if (explanation) {
      // Small delay to let UI render first
      setTimeout(() => {
        speakNative(explanation);
      }, 300);
    }
  }, []);

  // Speak when form step changes
  useEffect(() => {
    if (step === 'form' && !hasSpokenCurrentStep) {
      speakStepExplanation(formStep);
      setHasSpokenCurrentStep(true);
    }
  }, [formStep, step, hasSpokenCurrentStep, speakStepExplanation]);

  // Reset spoken flag when step changes
  useEffect(() => {
    setHasSpokenCurrentStep(false);
  }, [formStep]);

  // Stop speech when component unmounts
  useEffect(() => {
    return () => {
      stopNativeSpeaking();
    };
  }, []);

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

          // check-payment-status returns: { paymentStatus, matricula, userStatus, ... }
          if (data.paymentStatus === 'approved' && data.matricula && data.userStatus === 'approved') {
            setConfirmedMatricula(String(data.matricula));
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

  // Get form steps based on context
  const getFormSteps = (): FormStep[] => {
    const steps: FormStep[] = ['name', 'email', 'phone', 'cpf', 'salary', 'balances', 'creditCard'];
    
    if (isAdminAffiliateLink) {
      steps.push('pixKey');
    } else if (!isTrialMode) {
      steps.push('affiliate', 'coupon');
    }
    
    steps.push('review');
    return steps;
  };

  const formSteps = getFormSteps();
  const currentStepIndex = formSteps.indexOf(formStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === formSteps.length - 1;

  // Navigation functions
  const goToNextStep = () => {
    stopNativeSpeaking();
    if (!isLastStep) {
      const nextStep = formSteps[currentStepIndex + 1];
      setFormStep(nextStep);
    }
  };

  const goToPreviousStep = () => {
    stopNativeSpeaking();
    if (!isFirstStep) {
      const prevStep = formSteps[currentStepIndex - 1];
      setFormStep(prevStep);
    }
  };

  // Validate CPF format (basic validation)
  const isValidCPF = (cpfValue: string): boolean => {
    const numbers = cpfValue.replace(/\D/g, '');
    if (numbers.length !== 11) return false;
    
    // Check for known invalid patterns
    if (/^(\d)\1+$/.test(numbers)) return false;
    
    // Validate check digits
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers[9])) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers[10])) return false;
    
    return true;
  };

  // Real-time CPF validation
  const validateCPFRealtime = useCallback(async (cpfValue: string) => {
    const cleanCpf = cpfValue.replace(/\D/g, '');
    
    if (cleanCpf.length < 11) {
      setCpfValidation({ status: 'idle', message: '' });
      return;
    }
    
    if (!isValidCPF(cpfValue)) {
      setCpfValidation({ status: 'invalid', message: 'CPF inválido' });
      return;
    }
    
    setCpfValidation({ status: 'checking', message: 'Verificando...' });
    
    const { data } = await supabase
      .from('users_matricula')
      .select('matricula')
      .eq('cpf', cleanCpf)
      .maybeSingle();
    
    if (data) {
      setCpfValidation({ status: 'duplicate', message: 'CPF já cadastrado' });
    } else {
      setCpfValidation({ status: 'valid', message: 'CPF válido' });
    }
  }, []);

  // Real-time phone validation
  const validatePhoneRealtime = useCallback(async (phoneValue: string) => {
    const cleanPhone = phoneValue.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      setPhoneValidation({ status: 'idle', message: '' });
      return;
    }
    
    setPhoneValidation({ status: 'checking', message: 'Verificando...' });
    
    const { data } = await supabase
      .from('users_matricula')
      .select('matricula')
      .eq('phone', cleanPhone)
      .maybeSingle();
    
    if (data) {
      setPhoneValidation({ status: 'duplicate', message: 'Telefone já cadastrado' });
    } else {
      setPhoneValidation({ status: 'valid', message: 'Telefone disponível' });
    }
  }, []);

  // Real-time email validation
  const validateEmailRealtime = useCallback(async (emailValue: string) => {
    const trimmedEmail = emailValue.trim();
    
    if (!trimmedEmail) {
      setEmailValidation({ status: 'idle', message: '' });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailValidation({ status: 'invalid', message: 'E-mail inválido' });
      return;
    }
    
    setEmailValidation({ status: 'checking', message: 'Verificando...' });
    
    const { data } = await supabase
      .from('users_matricula')
      .select('matricula')
      .eq('email', trimmedEmail.toLowerCase())
      .maybeSingle();
    
    if (data) {
      setEmailValidation({ status: 'duplicate', message: 'E-mail já cadastrado' });
    } else {
      setEmailValidation({ status: 'valid', message: 'E-mail disponível' });
    }
  }, []);

  // Debounced validation effects
  useEffect(() => {
    const timer = setTimeout(() => {
      if (cpf.replace(/\D/g, '').length === 11) {
        validateCPFRealtime(cpf);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [cpf, validateCPFRealtime]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (phone.replace(/\D/g, '').length >= 10) {
        validatePhoneRealtime(phone);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [phone, validatePhoneRealtime]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (email.trim()) {
        validateEmailRealtime(email);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [email, validateEmailRealtime]);

  // Check for duplicate data in database
  const checkDuplicateData = async (): Promise<{ isDuplicate: boolean; field: string }> => {
    if (cpfValidation.status === 'duplicate') {
      return { isDuplicate: true, field: 'CPF' };
    }
    if (phoneValidation.status === 'duplicate') {
      return { isDuplicate: true, field: 'telefone' };
    }
    if (emailValidation.status === 'duplicate') {
      return { isDuplicate: true, field: 'e-mail' };
    }
    return { isDuplicate: false, field: '' };
  };

  // Validate current step before proceeding
  const validateCurrentStep = async (): Promise<boolean> => {
    setError('');
    
    switch (formStep) {
      case 'name':
        if (!fullName.trim()) {
          setError('Nome completo é obrigatório');
          return false;
        }
        if (fullName.trim().length < 3) {
          setError('Nome deve ter pelo menos 3 caracteres');
          return false;
        }
        break;
      case 'email':
        if (email.trim()) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email.trim())) {
            setError('E-mail inválido');
            return false;
          }
          if (emailValidation.status === 'duplicate') {
            setError('Este e-mail já está cadastrado');
            return false;
          }
        }
        break;
      case 'phone':
        if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
          setError('Telefone válido é obrigatório');
          return false;
        }
        if (phoneValidation.status === 'duplicate') {
          setError('Este telefone já está cadastrado');
          return false;
        }
        break;
      case 'cpf':
        if (!cpf.trim() || cpf.replace(/\D/g, '').length !== 11) {
          setError('CPF deve ter 11 dígitos');
          return false;
        }
        if (!isValidCPF(cpf)) {
          setError('CPF inválido. Verifique os dígitos.');
          return false;
        }
        if (cpfValidation.status === 'duplicate') {
          setError('Este CPF já está cadastrado');
          return false;
        }
        break;
      case 'pixKey':
        if (isAdminAffiliateLink && !pixKey.trim()) {
          setError('Chave PIX é obrigatória para afiliados');
          return false;
        }
        break;
    }
    
    return true;
  };

  const [isValidating, setIsValidating] = useState(false);

  const handleNextStep = async () => {
    setIsValidating(true);
    const isValid = await validateCurrentStep();
    setIsValidating(false);
    
    if (isValid) {
      goToNextStep();
    }
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
    if (!cpf.trim() || !isValidCPF(cpf)) {
      setError('CPF inválido');
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
    speakNative('Verificando seus dados. Aguarde um momento.');

    try {
      // Check for duplicate data
      const duplicateCheck = await checkDuplicateData();
      if (duplicateCheck.isDuplicate) {
        setError(`Este ${duplicateCheck.field} já está cadastrado em outra conta.`);
        setStep('form');
        setFormStep('review');
        setIsLoading(false);
        return;
      }

      speakNative('Processando seu cadastro.');
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
          initial_balance: parseCurrency(currentDebitBalance),
          credit_used: parseCurrency(currentCreditBalance),
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
          admin_affiliate_link_code: adminAffiliateLinkCode,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(insertError.message);
      }

      // Clear localStorage affiliate ref after successful signup
      localStorage.removeItem('inovafinance_affiliate_ref');
      
      setTrialMatricula(newMatricula.toString());
      setStep('trial_success');
      speakNative('Cadastro realizado com sucesso! Sua matrícula foi gerada.');

    } catch (e: any) {
      console.error('Trial signup error:', e);
      setError(e.message || 'Erro ao criar conta. Tente novamente.');
      setStep('form');
      setFormStep('review');
    }

    setIsLoading(false);
  };

  // Handle PAID subscription (with PIX payment)
  const handleSubmit = async () => {
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

    setError('');
    setIsLoading(true);
    setStep('processing');
    speakNative('Gerando seu código PIX. Aguarde um momento.');

    try {
      // Call edge function to create PIX payment
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-pix-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim(),
          cpf: cpf.replace(/\D/g, ''),
          salaryAmount: parseCurrency(salaryAmount),
          salaryDay: parseInt(salaryDay) || 5,
          advanceAmount: parseCurrency(advanceAmount),
          advanceDay: advanceDay ? parseInt(advanceDay) : null,
          hasCreditCard,
          creditLimit: hasCreditCard ? parseCurrency(creditLimit) : 0,
          creditDueDay: hasCreditCard ? parseInt(creditDueDay) : 5,
          // Current balances
          initialBalance: parseCurrency(currentDebitBalance),
          currentCreditUsed: parseCurrency(currentCreditBalance),
          affiliateCode: affiliateCode,
          couponCode: couponValidated ? couponCode : null,
          amount: subscriptionAmount,
          adminAffiliateLinkCode: adminAffiliateLinkCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar pagamento');
      }

      setPixData(data.pix);
      setUserTempId(data.userTempId);
      setPaymentId(data.paymentId);
      setStep('pix');
      speakNative('Código PIX gerado com sucesso! Copie o código ou escaneie o QR Code para pagar.');

    } catch (e: any) {
      console.error('Payment error:', e);
      setError(e.message || 'Erro ao criar pagamento. Tente novamente.');
      setStep('form');
      setFormStep('review');
    }

    setIsLoading(false);
  };

  // Render step progress indicator
  const renderProgressIndicator = () => {
    const totalSteps = formSteps.length;
    const progress = ((currentStepIndex + 1) / totalSteps) * 100;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">
            Passo {currentStepIndex + 1} de {totalSteps}
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>
    );
  };

  // Render current form step
  const renderFormStep = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={formStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {formStep === 'name' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold">Qual é o seu nome?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Digite seu nome completo
                </p>
              </div>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                className="bg-background/50 text-center text-lg h-14"
                autoFocus
              />
            </div>
          )}

          {formStep === 'email' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Qual é o seu e-mail?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Este campo é opcional
                </p>
              </div>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className={`bg-background/50 text-center text-lg h-14 pr-12 ${
                    emailValidation.status === 'duplicate' || emailValidation.status === 'invalid' 
                      ? 'border-red-500 focus-visible:ring-red-500' 
                      : emailValidation.status === 'valid' 
                        ? 'border-green-500 focus-visible:ring-green-500' 
                        : ''
                  }`}
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {emailValidation.status === 'checking' && (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  )}
                  {emailValidation.status === 'valid' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {(emailValidation.status === 'duplicate' || emailValidation.status === 'invalid') && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {emailValidation.message && (
                <p className={`text-sm text-center ${
                  emailValidation.status === 'valid' ? 'text-green-500' : 
                  emailValidation.status === 'duplicate' || emailValidation.status === 'invalid' ? 'text-red-500' : 
                  'text-muted-foreground'
                }`}>
                  {emailValidation.message}
                </p>
              )}
            </div>
          )}

          {formStep === 'phone' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Qual é o seu telefone?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Digite com DDD
                </p>
              </div>
              <div className="relative">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  className={`bg-background/50 text-center text-lg h-14 pr-12 ${
                    phoneValidation.status === 'duplicate' 
                      ? 'border-red-500 focus-visible:ring-red-500' 
                      : phoneValidation.status === 'valid' 
                        ? 'border-green-500 focus-visible:ring-green-500' 
                        : ''
                  }`}
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {phoneValidation.status === 'checking' && (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  )}
                  {phoneValidation.status === 'valid' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {phoneValidation.status === 'duplicate' && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {phoneValidation.message && (
                <p className={`text-sm text-center ${
                  phoneValidation.status === 'valid' ? 'text-green-500' : 
                  phoneValidation.status === 'duplicate' ? 'text-red-500' : 
                  'text-muted-foreground'
                }`}>
                  {phoneValidation.message}
                </p>
              )}
            </div>
          )}

          {formStep === 'cpf' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Qual é o seu CPF?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Necessário para verificação
                </p>
              </div>
              <div className="relative">
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className={`bg-background/50 text-center text-lg h-14 pr-12 ${
                    cpfValidation.status === 'duplicate' || cpfValidation.status === 'invalid'
                      ? 'border-red-500 focus-visible:ring-red-500' 
                      : cpfValidation.status === 'valid' 
                        ? 'border-green-500 focus-visible:ring-green-500' 
                        : ''
                  }`}
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {cpfValidation.status === 'checking' && (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  )}
                  {cpfValidation.status === 'valid' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                  {(cpfValidation.status === 'duplicate' || cpfValidation.status === 'invalid') && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </div>
              {cpfValidation.message && (
                <p className={`text-sm text-center ${
                  cpfValidation.status === 'valid' ? 'text-green-500' : 
                  cpfValidation.status === 'duplicate' || cpfValidation.status === 'invalid' ? 'text-red-500' : 
                  'text-muted-foreground'
                }`}>
                  {cpfValidation.message}
                </p>
              )}
            </div>
          )}

          {formStep === 'salary' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Informações do salário</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Para organizar seu planejamento
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-center block text-sm">Valor do salário</Label>
                  <Input
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(formatCurrency(e.target.value))}
                    placeholder="0,00"
                    className="bg-background/50 text-center"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-center block text-sm">Dia do pagamento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={salaryDay}
                    onChange={(e) => setSalaryDay(e.target.value)}
                    className="bg-background/50 text-center"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="space-y-2">
                  <Label className="text-center block text-sm">Vale/Adiantamento</Label>
                  <Input
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(formatCurrency(e.target.value))}
                    placeholder="0,00"
                    className="bg-background/50 text-center"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-center block text-sm">Dia do vale</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={advanceDay}
                    onChange={(e) => setAdvanceDay(e.target.value)}
                    placeholder="--"
                    className="bg-background/50 text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {formStep === 'balances' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Saldos atuais</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Informe seus saldos em conta
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-center block text-sm">Saldo atual em Débito (conta corrente)</Label>
                  <Input
                    value={currentDebitBalance}
                    onChange={(e) => setCurrentDebitBalance(formatCurrency(e.target.value))}
                    placeholder="0,00"
                    className="bg-background/50 text-center text-lg h-14"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-center block text-sm">Saldo atual em Crédito (usado no cartão)</Label>
                  <Input
                    value={currentCreditBalance}
                    onChange={(e) => setCurrentCreditBalance(formatCurrency(e.target.value))}
                    placeholder="0,00"
                    className="bg-background/50 text-center text-lg h-14"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                O saldo total será a soma do débito com o crédito disponível
              </p>
            </div>
          )}

          {formStep === 'creditCard' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Cartão de crédito</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Simule seu cartão de crédito
                </p>
              </div>
              
              <div className="flex items-center justify-center gap-4 p-4 bg-background/30 rounded-lg">
                <span className="text-sm">Tenho cartão de crédito</span>
                <Switch
                  checked={hasCreditCard}
                  onCheckedChange={setHasCreditCard}
                />
              </div>

              <AnimatePresence>
                {hasCreditCard && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div className="space-y-2">
                      <Label className="text-center block text-sm">Limite</Label>
                      <Input
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(formatCurrency(e.target.value))}
                        placeholder="0,00"
                        className="bg-background/50 text-center"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-center block text-sm">Dia vencimento</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={creditDueDay}
                        onChange={(e) => setCreditDueDay(e.target.value)}
                        className="bg-background/50 text-center"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {formStep === 'affiliate' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Código de indicação</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ganhe desconto com código de afiliado
                </p>
              </div>

              {affiliateCode ? (
                <div className="p-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
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
                      className="text-xs mt-2 w-full"
                    >
                      Remover código
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={manualAffiliateCode}
                    onChange={(e) => setManualAffiliateCode(e.target.value)}
                    placeholder="Digite o código"
                    className="bg-background/50 text-center"
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

          {formStep === 'coupon' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Tag className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Cupom de desconto</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tem um cupom? Digite aqui
                </p>
              </div>

              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponValidated(false);
                  }}
                  placeholder="PROMO10"
                  className="bg-background/50 text-center uppercase"
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
                  disabled={isValidatingCoupon || (!couponValidated && !couponCode.trim())}
                  className="shrink-0"
                >
                  {isValidatingCoupon ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : couponValidated ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Remover
                    </>
                  ) : (
                    'Aplicar'
                  )}
                </Button>
              </div>

              {couponValidated && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <p className="text-sm text-green-400">
                    Desconto de R$ {couponDiscount.toFixed(2).replace('.', ',')} aplicado!
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {formStep === 'pixKey' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Chave PIX para comissões</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Receba suas comissões de 50%
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm text-center block">Tipo de chave PIX</Label>
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
                      className={`p-3 rounded-lg text-sm font-medium transition-all ${
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
                <Label className="text-sm text-center block">Chave PIX</Label>
                <Input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={
                    pixKeyType === 'cpf' ? '000.000.000-00' :
                    pixKeyType === 'email' ? 'seu@email.com' :
                    pixKeyType === 'phone' ? '(00) 00000-0000' :
                    'Chave aleatória'
                  }
                  className="bg-background/50 text-center"
                />
              </div>
            </div>
          )}

          {formStep === 'review' && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold">Revise seus dados</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Confira se está tudo certo
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Nome</span>
                  <span className="text-sm font-medium">{fullName || '-'}</span>
                </div>
                <div className="flex justify-between p-3 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">E-mail</span>
                  <span className="text-sm font-medium">{email || 'Não informado'}</span>
                </div>
                <div className="flex justify-between p-3 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Telefone</span>
                  <span className="text-sm font-medium">{phone || '-'}</span>
                </div>
                <div className="flex justify-between p-3 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">CPF</span>
                  <span className="text-sm font-medium">{cpf || '-'}</span>
                </div>
                <div className="flex justify-between p-3 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Salário</span>
                  <span className="text-sm font-medium">
                    {salaryAmount ? `R$ ${salaryAmount}` : 'Não informado'}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Saldo Débito</span>
                  <span className="text-sm font-medium">
                    {currentDebitBalance ? `R$ ${currentDebitBalance}` : 'R$ 0,00'}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-background/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Saldo Crédito</span>
                  <span className="text-sm font-medium">
                    {currentCreditBalance ? `R$ ${currentCreditBalance}` : 'R$ 0,00'}
                  </span>
                </div>
                {hasCreditCard && (
                  <div className="flex justify-between p-3 bg-background/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Limite do cartão</span>
                    <span className="text-sm font-medium">R$ {creditLimit}</span>
                  </div>
                )}
              </div>

              {/* Price summary */}
              {!isTrialMode && (
                <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {isAdminAffiliateLink ? 'Conta de Afiliado' : 'Assinatura mensal'}
                    </span>
                    <span className="text-xl font-bold">
                      {isAdminAffiliateLink ? (
                        <span className="text-emerald-400">GRÁTIS</span>
                      ) : (
                        `R$ ${subscriptionAmount.toFixed(2).replace('.', ',')}`
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* WhatsApp Support Button */}
              <button
                type="button"
                onClick={() => {
                  const message = encodeURIComponent('Olá! Preciso de ajuda com o INOVAFINANCE');
                  window.open(`https://wa.me/5511978197645?text=${message}`, '_blank');
                }}
                className="mt-4 w-full flex items-center justify-center gap-2 p-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="font-medium">Precisa de ajuda? Fale conosco</span>
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  // Render navigation buttons
  const renderNavigationButtons = () => {
    return (
      <div className="flex gap-3 mt-6">
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousStep}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        )}
        
        {isLastStep ? (
          <Button
            type="button"
            onClick={isTrialMode || isAdminAffiliateLink ? handleTrialSignup : handleSubmit}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            {isTrialMode || isAdminAffiliateLink ? 'Criar conta' : 'Pagar com PIX'}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNextStep}
            disabled={isValidating}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {isValidating ? 'Validando...' : 'Próximo'}
            {!isValidating && <ArrowRight className="w-4 h-4 ml-2" />}
          </Button>
        )}
      </div>
    );
  };

  // Render processing step
  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-background to-background/95">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto mb-6"
            >
              <div className="w-full h-full rounded-full border-4 border-primary/20 border-t-primary" />
            </motion.div>
            <Sparkles className="w-8 h-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Processando...</h2>
          <p className="text-muted-foreground">Aguarde um momento</p>
        </motion.div>
      </div>
    );
  }

  // Render PIX payment step
  if (step === 'pix' && pixData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-background to-background/95">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <GlassCard className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl font-semibold">Pague com PIX</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Valor: R$ {subscriptionAmount.toFixed(2).replace('.', ',')}
              </p>
            </div>

            {/* QR Code */}
            {pixData.qrCodeBase64 && (
              <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-6">
                <img 
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`} 
                  alt="QR Code PIX"
                  className="w-48 h-48"
                />
              </div>
            )}

            {/* Copy code button */}
            <Button
              onClick={copyPixCode}
              variant="outline"
              className="w-full mb-4"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Código copiado!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar código PIX
                </>
              )}
            </Button>

            {/* Expiration info */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Aguardando pagamento...</span>
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                setStep('form');
                setFormStep('review');
              }}
              className="w-full mt-4"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // Render success step
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-background to-background/95">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Pagamento confirmado!</h2>
          <p className="text-muted-foreground mb-2">
            Sua conta foi criada com sucesso
          </p>
          {confirmedMatricula && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6"
            >
              <p className="text-sm text-muted-foreground mb-1">Sua matrícula é:</p>
              <p className="text-3xl font-bold text-primary">{confirmedMatricula}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Use este número para fazer login
              </p>
            </motion.div>
          )}
          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-primary to-accent"
          >
            Fazer login
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // Render trial success step
  if (step === 'trial_success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background via-background to-background/95">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">
            {isAdminAffiliateLink ? 'Conta de afiliado criada!' : 'Conta criada com sucesso!'}
          </h2>
          <p className="text-muted-foreground mb-4">
            Sua matrícula é: <span className="font-bold text-primary">{trialMatricula}</span>
          </p>
          {isAdminAffiliateLink ? (
            <p className="text-sm text-amber-400 mb-6">
              Lembre-se: faça sua primeira venda em 7 dias para manter a conta ativa!
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mb-6">
              Você tem 24 horas de teste gratuito
            </p>
          )}
          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-primary to-accent"
          >
            Fazer login
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  // Render form step
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-background/95">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">
            {isTrialMode ? 'Teste Grátis' : isAdminAffiliateLink ? 'Cadastro de Afiliado' : 'Criar Conta'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isTrialMode ? '24 horas gratuitas' : isAdminAffiliateLink ? 'Conta gratuita' : 'Assinatura mensal'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Admin affiliate banner */}
          {isAdminAffiliateLink && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Parceiro INOVAFINANCE
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Conta gratuita + 50% de comissão
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                </div>
              </div>
            </motion.div>
          )}

          <GlassCard className="p-6">
            {renderProgressIndicator()}
            
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 mb-4"
              >
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">{error}</span>
              </motion.div>
            )}

            {renderFormStep()}
            {renderNavigationButtons()}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  User,
  Mail,
  Phone,
  FileText,
  Check,
  ChevronRight,
  Gift,
  Loader2,
  Copy,
  CheckCircle,
  ArrowLeft,
  Sparkles,
  Shield,
  DollarSign,
  Calendar
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Step = 'form' | 'pix' | 'success';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  hasCreditCard: boolean;
  creditLimit: string;
  creditDueDay: string;
  salaryAmount: string;
  salaryDay: string;
  advanceAmount: string;
  advanceDay: string;
}

export default function Subscribe() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState<Step>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState('');
  const [affiliateValid, setAffiliateValid] = useState<boolean | null>(null);
  const [affiliateApplied, setAffiliateApplied] = useState(false);
  const [prices, setPrices] = useState({ standard: 49.99, affiliate: 29.99 });
  const [copiedPix, setCopiedPix] = useState(false);
  const [generatedMatricula, setGeneratedMatricula] = useState('');
  
  const [pixData, setPixData] = useState<{
    qrCode: string | null;
    qrCodeBase64: string | null;
    amount: number;
    userTempId: string;
  } | null>(null);

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    hasCreditCard: false,
    creditLimit: '',
    creditDueDay: '5',
    salaryAmount: '',
    salaryDay: '5',
    advanceAmount: '',
    advanceDay: '',
  });

  // Load affiliate code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setAffiliateCode(refCode);
      validateAffiliateCode(refCode);
    }
    loadPrices();
  }, [searchParams]);

  const loadPrices = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['subscription_price', 'affiliate_price']);

    if (data) {
      const priceMap: Record<string, number> = {};
      data.forEach((s) => {
        if (s.key === 'subscription_price' && s.value) priceMap.standard = parseFloat(s.value);
        if (s.key === 'affiliate_price' && s.value) priceMap.affiliate = parseFloat(s.value);
      });
      setPrices({
        standard: priceMap.standard || 49.99,
        affiliate: priceMap.affiliate || 29.99,
      });
    }
  };

  const validateAffiliateCode = async (code: string) => {
    if (!code || code.length < 6) {
      setAffiliateValid(null);
      setAffiliateApplied(false);
      return;
    }

    const { data } = await supabase
      .from('users_matricula')
      .select('matricula, user_status')
      .eq('matricula', parseInt(code))
      .eq('user_status', 'approved')
      .maybeSingle();

    if (data) {
      setAffiliateValid(true);
      setAffiliateApplied(true);
      toast.success('Código de afiliado aplicado!');
    } else {
      setAffiliateValid(false);
      setAffiliateApplied(false);
    }
  };

  const applyAffiliateCode = () => {
    validateAffiliateCode(affiliateCode);
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    if (field === 'cpf' && typeof value === 'string') {
      value = formatCPF(value);
    }
    if (field === 'phone' && typeof value === 'string') {
      value = formatPhone(value);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      toast.error('Digite seu nome completo');
      return false;
    }
    if (!formData.phone.trim() || formData.phone.replace(/\D/g, '').length < 10) {
      toast.error('Digite um telefone válido');
      return false;
    }
    if (!formData.cpf.trim() || formData.cpf.replace(/\D/g, '').length !== 11) {
      toast.error('Digite um CPF válido');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('create-pix-payment', {
        body: {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf,
          hasCreditCard: formData.hasCreditCard,
          creditLimit: parseFloat(formData.creditLimit) || 0,
          creditDueDay: parseInt(formData.creditDueDay) || 5,
          salaryAmount: parseFloat(formData.salaryAmount) || 0,
          salaryDay: parseInt(formData.salaryDay) || 5,
          advanceAmount: parseFloat(formData.advanceAmount) || 0,
          advanceDay: formData.advanceDay ? parseInt(formData.advanceDay) : null,
          affiliateCode: affiliateApplied ? parseInt(affiliateCode) : null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar PIX');
      }

      const data = response.data;
      setPixData({
        qrCode: data.pix?.qrCode || null,
        qrCodeBase64: data.pix?.qrCodeBase64 || null,
        amount: data.amount,
        userTempId: data.userTempId,
      });
      setStep('pix');
      
      // Start polling for payment status
      startPaymentPolling(data.userTempId);
    } catch (error: any) {
      console.error('Error creating PIX payment:', error);
      toast.error(error.message || 'Erro ao gerar PIX');
    } finally {
      setIsLoading(false);
    }
  };

  const startPaymentPolling = (userTempId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await supabase.functions.invoke('check-payment-status', {
          body: { userTempId },
        });

        if (response.data?.status === 'approved') {
          clearInterval(pollInterval);
          setGeneratedMatricula(response.data.matricula?.toString() || '');
          setStep('success');
          toast.success('Pagamento confirmado!');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 30 minutes
    setTimeout(() => clearInterval(pollInterval), 30 * 60 * 1000);
  };

  const copyPixCode = async () => {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopiedPix(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopiedPix(false), 2000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const currentPrice = affiliateApplied ? prices.affiliate : prices.standard;

  return (
    <div className="min-h-screen pb-10 px-4 pt-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">Assine Agora</h1>
            <p className="text-muted-foreground text-sm">
              Seu gestor financeiro inteligente
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-6">
          {['Dados', 'Pagamento', 'Ativação'].map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = (step === 'form' && stepNum === 1) ||
                           (step === 'pix' && stepNum === 2) ||
                           (step === 'success' && stepNum === 3);
            const isPast = (step === 'pix' && stepNum === 1) ||
                          (step === 'success' && (stepNum === 1 || stepNum === 2));
            
            return (
              <div key={label} className="flex-1">
                <div className={`h-2 rounded-full transition-colors ${
                  isActive || isPast ? 'bg-primary' : 'bg-muted'
                }`} />
                <p className={`text-xs mt-1 text-center font-medium ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {label}
                </p>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Form Step */}
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Price Card */}
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Plano Premium</p>
                    <p className="text-3xl font-bold text-primary">
                      {formatCurrency(currentPrice)}
                    </p>
                    {affiliateApplied && (
                      <p className="text-xs text-success font-medium">
                        🎉 Desconto de indicação aplicado!
                      </p>
                    )}
                  </div>
                  <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                </div>
              </GlassCard>

              {/* Affiliate Code Field */}
              {!affiliateApplied && (
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">Código de indicação (opcional)</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={affiliateCode}
                      onChange={(e) => setAffiliateCode(e.target.value)}
                      placeholder="Digite o código"
                      className="bg-muted/50"
                    />
                    <Button onClick={applyAffiliateCode} variant="outline">
                      Aplicar
                    </Button>
                  </div>
                  {affiliateValid === false && (
                    <p className="text-xs text-destructive mt-2">Código inválido</p>
                  )}
                </GlassCard>
              )}

              {affiliateApplied && (
                <GlassCard className="p-4 border-2 border-success/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Você foi indicado!</p>
                      <p className="text-xs text-muted-foreground">
                        Código #{affiliateCode} aplicado
                      </p>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Personal Data */}
              <GlassCard className="p-5 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Dados pessoais
                </h3>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Nome completo *</label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    placeholder="Seu nome completo"
                    className="bg-muted/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">E-mail</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    className="bg-muted/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Telefone *</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="bg-muted/50"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">CPF *</label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => handleChange('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    className="bg-muted/50"
                  />
                </div>
              </GlassCard>

              {/* Financial Data */}
              <GlassCard className="p-5 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Dados financeiros (opcional)
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Salário</label>
                    <Input
                      type="number"
                      value={formData.salaryAmount}
                      onChange={(e) => handleChange('salaryAmount', e.target.value)}
                      placeholder="R$ 0,00"
                      className="bg-muted/50"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Dia do salário</label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.salaryDay}
                      onChange={(e) => handleChange('salaryDay', e.target.value)}
                      placeholder="5"
                      className="bg-muted/50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                  <input
                    type="checkbox"
                    id="hasCreditCard"
                    checked={formData.hasCreditCard}
                    onChange={(e) => handleChange('hasCreditCard', e.target.checked)}
                    className="w-5 h-5 rounded border-border"
                  />
                  <label htmlFor="hasCreditCard" className="text-sm">
                    Tenho cartão de crédito
                  </label>
                </div>

                {formData.hasCreditCard && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Limite</label>
                      <Input
                        type="number"
                        value={formData.creditLimit}
                        onChange={(e) => handleChange('creditLimit', e.target.value)}
                        placeholder="R$ 0,00"
                        className="bg-muted/50"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Vencimento</label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.creditDueDay}
                        onChange={(e) => handleChange('creditDueDay', e.target.value)}
                        placeholder="5"
                        className="bg-muted/50"
                      />
                    </div>
                  </div>
                )}
              </GlassCard>

              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-14 bg-gradient-primary text-lg font-bold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  <>
                    Continuar para pagamento
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* PIX Step */}
          {step === 'pix' && pixData && (
            <motion.div
              key="pix"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <GlassCard className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Pague via PIX</h2>
                <p className="text-muted-foreground text-sm mb-4">
                  Escaneie o QR Code ou copie o código
                </p>
                <p className="text-3xl font-bold text-primary mb-4">
                  {formatCurrency(pixData.amount)}
                </p>
              </GlassCard>

              {pixData.qrCodeBase64 && (
                <GlassCard className="p-6 flex justify-center">
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </GlassCard>
              )}

              {pixData.qrCode && (
                <GlassCard className="p-4">
                  <p className="text-sm text-muted-foreground mb-2">Código PIX (copia e cola):</p>
                  <div className="bg-muted/50 rounded-lg p-3 mb-3 max-h-24 overflow-auto">
                    <p className="text-xs font-mono break-all">{pixData.qrCode}</p>
                  </div>
                  <Button
                    onClick={copyPixCode}
                    className="w-full"
                    variant="outline"
                  >
                    {copiedPix ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2 text-success" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar código PIX
                      </>
                    )}
                  </Button>
                </GlassCard>
              )}

              <GlassCard className="p-4 border-l-4 border-l-warning">
                <div className="flex items-start gap-3">
                  <Loader2 className="w-5 h-5 text-warning animate-spin flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Aguardando pagamento...</p>
                    <p className="text-xs text-muted-foreground">
                      Após o pagamento, você será redirecionado automaticamente.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <GlassCard className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-10 h-10 text-success" />
                </motion.div>
                
                <h2 className="text-2xl font-bold mb-2">Pagamento Confirmado!</h2>
                <p className="text-muted-foreground mb-6">
                  Sua conta foi ativada com sucesso.
                </p>

                {generatedMatricula && (
                  <div className="bg-muted/50 rounded-xl p-4 mb-6">
                    <p className="text-sm text-muted-foreground mb-1">Sua matrícula:</p>
                    <p className="text-4xl font-mono font-bold text-primary">
                      {generatedMatricula}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Guarde este número para acessar sua conta
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => navigate('/login')}
                    className="w-full h-12 bg-gradient-primary"
                  >
                    Acessar minha conta
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Dica de segurança</p>
                    <p className="text-xs text-muted-foreground">
                      Anote sua matrícula em local seguro. Ela é necessária para acessar sua conta.
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Wallet, Mail, Phone, CreditCard, Calendar, CheckCircle, Sparkles, Briefcase, DollarSign, CalendarDays, ArrowLeft, AlertCircle, Upload, FileText, X, ImageIcon } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type Step = 'payment_proof' | 'register' | 'success';

export default function Cadastros() {
  const [step, setStep] = useState<Step>('payment_proof');
  const [generatedMatricula, setGeneratedMatricula] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [creditDueDay, setCreditDueDay] = useState('');
  const [creditAvailable, setCreditAvailable] = useState('');
  const [hasCreditCard, setHasCreditCard] = useState<boolean | null>(null);
  const [isClt, setIsClt] = useState<boolean | null>(null);
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryDay, setSalaryDay] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceDay, setAdvanceDay] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);

  const navigate = useNavigate();

  // Gerar matrícula única de 6 dígitos
  const generateMatricula = async (): Promise<number> => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const newMatricula = Math.floor(100000 + Math.random() * 900000);

      // Verificar se já existe no Supabase
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setError('Tipo de arquivo inválido. Use JPG, PNG, WEBP ou PDF.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Arquivo muito grande. Máximo 5MB.');
        return;
      }

      setPaymentProofFile(file);
      setError('');

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPaymentProofPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPaymentProofPreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setPaymentProofFile(null);
    setPaymentProofPreview(null);
  };

  const handleContinueToRegister = () => {
    if (!paymentProofFile) {
      setError('Por favor, envie o comprovante de pagamento');
      return;
    }
    setError('');
    setStep('register');
  };

  const handleRegister = async () => {
    if (!fullName.trim()) {
      setError('Digite seu nome completo');
      return;
    }
    if (!email.trim()) {
      setError('Digite seu email');
      return;
    }
    if (!phone.trim()) {
      setError('Digite seu número de WhatsApp');
      return;
    }
    if (!paymentProofFile) {
      setError('Comprovante de pagamento é obrigatório');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Gerar matrícula única
      const newMatricula = await generateMatricula();

      // Upload payment proof to Supabase Storage
      const fileExt = paymentProofFile.name.split('.').pop();
      const fileName = `${newMatricula}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, paymentProofFile);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // Criar usuário no Supabase
      const { error: insertError } = await supabase
        .from('users_matricula')
        .insert({
          matricula: newMatricula,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          initial_balance: parseFloat(initialBalance) || 0,
          has_credit_card: hasCreditCard === true,
          credit_limit: hasCreditCard ? (parseFloat(creditLimit) || 0) : 0,
          credit_available: hasCreditCard ? (parseFloat(creditAvailable) || 0) : 0,
          credit_due_day: hasCreditCard ? (parseInt(creditDueDay) || 5) : null,
          salary_amount: isClt ? (parseFloat(salaryAmount) || 0) : 0,
          salary_day: isClt ? (parseInt(salaryDay) || 5) : 5,
          advance_amount: isClt ? (parseFloat(advanceAmount) || 0) : 0,
          advance_day: isClt && advanceDay ? (parseInt(advanceDay) || null) : null,
          payment_proof_url: urlData.publicUrl,
        });

      if (insertError) throw insertError;

      setGeneratedMatricula(newMatricula.toString());
      setStep('success');
    } catch (err) {
      console.error(err);
      setError('Erro ao registrar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[60px]"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.15, 0.2, 0.15]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-secondary/15 rounded-full blur-[50px]"
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.15, 0.18, 0.15]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      {/* Header with back button */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 relative z-10"
      >
        <button
          onClick={handleGoToLogin}
          className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="font-display text-3xl font-bold text-foreground">
          INOVAFINANCE
        </h1>
        <p className="text-muted-foreground text-xs md:text-sm mt-1">
          Criar nova conta
        </p>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {step === 'payment_proof' && (
          <motion.div
            key="payment_proof"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm relative z-10"
          >
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-center mb-2">
                Comprovante de Pagamento
              </h2>

              {/* Warning Alert */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-200 font-medium mb-1">
                      Atenção: Pagamento obrigatório
                    </p>
                    <p className="text-xs text-amber-200/80">
                      Para ativar sua conta, é necessário enviar o comprovante do pagamento da taxa de adesão. Seu cadastro será analisado após o envio.
                    </p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Warning */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-emerald-200/80">
                      Certifique-se de informar um número de WhatsApp válido. Sua matrícula será enviada por lá após a aprovação.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Card */}
              {!paymentProofFile ? (
                <label className="block cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium mb-1">
                      Clique para enviar comprovante
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, WEBP ou PDF (máx. 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {paymentProofPreview ? (
                        <ImageIcon className="w-5 h-5 text-primary" />
                      ) : (
                        <FileText className="w-5 h-5 text-primary" />
                      )}
                      <div>
                        <p className="text-sm font-medium truncate max-w-[180px]">
                          {paymentProofFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(paymentProofFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {paymentProofPreview && (
                    <img
                      src={paymentProofPreview}
                      alt="Preview do comprovante"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                </div>
              )}

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-destructive text-sm text-center mt-4"
                >
                  {error}
                </motion.p>
              )}

              <Button
                onClick={handleContinueToRegister}
                disabled={!paymentProofFile}
                className="w-full mt-6 bg-gradient-primary hover:opacity-90 glow-primary"
              >
                Continuar
              </Button>

              <button
                onClick={handleGoToLogin}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
              >
                Já tenho conta
              </button>
            </GlassCard>
          </motion.div>
        )}

        {step === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar relative z-10"
          >
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold text-center mb-1">
                Dados pessoais
              </h2>
              <p className="text-muted-foreground text-xs text-center mb-6">
                Complete seu cadastro para continuar
              </p>

              <div className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-primary" />
                      Nome completo *
                    </label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Digite seu nome"
                      className="bg-muted/30 border-border h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-primary" />
                      Email *
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="bg-muted/30 border-border h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-primary" />
                      WhatsApp *
                    </label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="bg-muted/30 border-border h-10 text-sm"
                      maxLength={15}
                    />
                    <p className="text-xs text-muted-foreground">
                      Sua matrícula será enviada por WhatsApp
                    </p>
                  </div>
                </div>

                {/* Saldo Débito */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-500" />
                    Saldo débito (conta)
                  </label>
                  <Input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="R$ 0,00"
                    className="bg-muted/50 border-border"
                  />
                </div>

                {/* Pergunta Cartão de Crédito */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-secondary" />
                    Você tem cartão de crédito?
                  </label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={hasCreditCard === true ? "default" : "outline"}
                      className={`flex-1 ${hasCreditCard === true ? 'bg-gradient-primary' : ''}`}
                      onClick={() => setHasCreditCard(true)}
                    >
                      Sim
                    </Button>
                    <Button
                      type="button"
                      variant={hasCreditCard === false ? "default" : "outline"}
                      className={`flex-1 ${hasCreditCard === false ? 'bg-gradient-primary' : ''}`}
                      onClick={() => setHasCreditCard(false)}
                    >
                      Não
                    </Button>
                  </div>
                </div>

                {/* Campos condicionais Cartão de Crédito */}
                {hasCreditCard === true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-secondary" />
                        Limite total do cartão
                      </label>
                      <Input
                        type="number"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        placeholder="R$ 0,00"
                        className="bg-muted/50 border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-500" />
                        Valor disponível atual
                      </label>
                      <Input
                        type="number"
                        value={creditAvailable}
                        onChange={(e) => setCreditAvailable(e.target.value)}
                        placeholder="R$ 0,00"
                        className="bg-muted/50 border-border"
                      />
                      <p className="text-xs text-muted-foreground">
                        Quanto você tem disponível no cartão agora
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-warning" />
                        Dia de vencimento da fatura
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={creditDueDay}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!e.target.value || (val >= 1 && val <= 31)) {
                            setCreditDueDay(e.target.value);
                          }
                        }}
                        placeholder="Ex: 15"
                        className="bg-muted/50 border-border"
                      />
                      <p className="text-xs text-muted-foreground">
                        No vencimento, o limite será restaurado para o valor total
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Pergunta CLT */}
                <div className="space-y-3 pt-2 border-t border-border">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    Você é CLT?
                  </label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={isClt === true ? "default" : "outline"}
                      className={`flex-1 ${isClt === true ? 'bg-gradient-primary' : ''}`}
                      onClick={() => setIsClt(true)}
                    >
                      Sim
                    </Button>
                    <Button
                      type="button"
                      variant={isClt === false ? "default" : "outline"}
                      className={`flex-1 ${isClt === false ? 'bg-gradient-primary' : ''}`}
                      onClick={() => setIsClt(false)}
                    >
                      Não
                    </Button>
                  </div>
                </div>

                {/* Campos condicionais CLT */}
                {isClt === true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        Valor do salário
                      </label>
                      <Input
                        type="number"
                        value={salaryAmount}
                        onChange={(e) => setSalaryAmount(e.target.value)}
                        placeholder="R$ 0,00"
                        className="bg-muted/50 border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-secondary" />
                        Dia do pagamento do salário
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={salaryDay}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!e.target.value || (val >= 1 && val <= 31)) {
                            setSalaryDay(e.target.value);
                          }
                        }}
                        placeholder="Ex: 5"
                        className="bg-muted/50 border-border"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-blue-500" />
                        Valor do adiantamento
                      </label>
                      <Input
                        type="number"
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(e.target.value)}
                        placeholder="R$ 0,00 (opcional)"
                        className="bg-muted/50 border-border"
                      />
                      <p className="text-xs text-muted-foreground">
                        Deixe em branco se não recebe adiantamento
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-blue-500" />
                        Dia do adiantamento
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={advanceDay}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!e.target.value || (val >= 1 && val <= 31)) {
                            setAdvanceDay(e.target.value);
                          }
                        }}
                        placeholder="Ex: 20"
                        className="bg-muted/50 border-border"
                      />
                    </div>
                  </motion.div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-destructive text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}

                <Button
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="w-full bg-gradient-primary hover:opacity-90 glow-primary"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Criar conta'
                  )}
                </Button>

                <button
                  onClick={() => setStep('payment_proof')}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Voltar
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm relative z-10"
          >
            <GlassCard className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6"
              >
                <Sparkles className="w-10 h-10 text-amber-500" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-2">Cadastro Enviado!</h2>
              <p className="text-muted-foreground mb-6">
                Seu cadastro foi enviado para análise. Aguarde a aprovação do administrador.
              </p>

              <div className="bg-muted/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-2">Sua matrícula será:</p>
                <p className="text-3xl font-bold text-primary font-mono tracking-wider">
                  {generatedMatricula}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Anote este número! Você receberá por WhatsApp após a aprovação.
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-200 text-left">
                      Seu acesso será liberado após a análise do comprovante de pagamento pelo administrador.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGoToLogin}
                className="w-full bg-gradient-primary hover:opacity-90 glow-primary"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Ir para Login
              </Button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

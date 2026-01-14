import { useState, useEffect, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, User, Wallet, Mail, Phone, CreditCard, Calendar, UserPlus, CheckCircle, Sparkles, Fingerprint, Briefcase, DollarSign, CalendarDays } from 'lucide-react';
import { NumericKeypad } from '@/components/NumericKeypad';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  isBiometricSupported,
  isPlatformAuthenticatorAvailable,
  isBiometricEnabled,
  authenticateWithBiometric,
  getBiometricMatricula
} from '@/services/biometricService';

type Step = 'matricula' | 'register' | 'success' | 'pending' | 'rejected';

// Componente de fundo memoizado para evitar re-renderizações caras
const AnimatedBackground = memo(({ introPhase }: { introPhase: string }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Floating gradient orbs - otimizados */}
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

    {/* Floating coins animation - apenas após a intro */}
    {introPhase === 'content' && [...Array(3)].map((_, i) => (
      <motion.div
        key={`coin-${i}`}
        className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md"
        style={{
          left: `${20 + i * 30}%`,
          bottom: '-25px',
        }}
        initial={{ opacity: 0 }}
        animate={{
          y: [0, -120, -80],
          opacity: [0, 0.8, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          delay: i * 1.3,
          ease: "easeOut"
        }}
      />
    ))}
  </div>
));

AnimatedBackground.displayName = 'AnimatedBackground';

export default function Login() {
  const [introPhase, setIntroPhase] = useState<'logo' | 'tagline' | 'content'>('logo');
  const [step, setStep] = useState<Step>('matricula');
  const [matricula, setMatricula] = useState('');
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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  // Intro animation sequence otimizada - tempos reduzidos
  useEffect(() => {
    // Phase 1: Logo appears (already showing)
    // Phase 2: After 0.8s, show tagline (reduzido de 1.5s)
    const taglineTimer = setTimeout(() => {
      setIntroPhase('tagline');
    }, 800);

    // Phase 3: After 1.6s total, show content (reduzido de 3s)
    const contentTimer = setTimeout(() => {
      setIntroPhase('content');
    }, 1600);

    return () => {
      clearTimeout(taglineTimer);
      clearTimeout(contentTimer);
    };
  }, []);

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometric = async () => {
      const supported = isBiometricSupported();
      const available = await isPlatformAuthenticatorAvailable();
      const enabled = isBiometricEnabled();

      setBiometricAvailable(supported && available);
      setBiometricEnabled(enabled);
    };
    checkBiometric();
  }, []);

  // Handle biometric login
  const handleBiometricLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const storedMatricula = await authenticateWithBiometric();

      if (storedMatricula) {
        // Verify user exists in Supabase
        const { data: existingUser, error: fetchError } = await supabase
          .from('users_matricula')
          .select('*')
          .eq('matricula', storedMatricula)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingUser) {
          // Check user status for biometric login too
          const userStatus = existingUser.user_status as string;

          if (userStatus === 'pending') {
            setStep('pending');
            return;
          }

          if (userStatus === 'rejected') {
            setStep('rejected');
            return;
          }

          if (userStatus === 'approved') {
            const success = await login(storedMatricula, existingUser.full_name || '');
            if (success) {
              navigate('/');
            } else {
              setError('Erro ao fazer login');
            }
          } else {
            setError('Status de conta inválido');
          }
        } else {
          setError('Usuário não encontrado');
        }
      } else {
        setError('Autenticação biométrica cancelada');
      }
    } catch (err) {
      console.error(err);
      setError('Erro na autenticação biométrica');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleMatriculaSubmit = async () => {
    if (matricula.length !== 6) {
      setError('Digite os 6 dígitos da matrícula');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Verificar se usuário existe no Supabase
      const { data: existingUser, error: fetchError } = await supabase
        .from('users_matricula')
        .select('*')
        .eq('matricula', parseInt(matricula))
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingUser) {
        // Check user status before allowing login
        const userStatus = existingUser.user_status as string;

        if (userStatus === 'pending') {
          setStep('pending');
          return;
        }

        if (userStatus === 'rejected') {
          setStep('rejected');
          return;
        }

        // Only approved users can login
        if (userStatus === 'approved') {
          const success = await login(parseInt(matricula), existingUser.full_name || '');
          if (success) {
            navigate('/');
          } else {
            setError('Erro ao fazer login');
          }
        } else {
          setError('Status de conta inválido');
        }
      } else {
        setError('Matrícula não encontrada. Crie uma conta.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao verificar matrícula');
    } finally {
      setIsLoading(false);
    }
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

    setIsLoading(true);
    setError('');

    try {
      // Gerar matrícula única
      const newMatricula = await generateMatricula();

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
        });

      if (insertError) throw insertError;

      // Calcular próxima data de vencimento baseado no dia
      const dueDay = parseInt(creditDueDay) || 5;
      const today = new Date();
      let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      if (dueDate <= today) {
        dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
      }

      // Login local com os dados extras
      const success = await login(
        newMatricula,
        fullName.trim(),
        email.trim(),
        phone.trim(),
        parseFloat(initialBalance) || 0,
        parseFloat(creditLimit) || 5000,
        dueDay
      );

      // Don't login the user - account needs admin approval
      // Just show success screen with pending message
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
    // Logout and go back to login screen
    setMatricula('');
    setGeneratedMatricula('');
    setFullName('');
    setEmail('');
    setPhone('');
    setInitialBalance('');
    setCreditLimit('');
    setCreditDueDay('');
    setCreditAvailable('');
    setHasCreditCard(null);
    setIsClt(null);
    setSalaryAmount('');
    setSalaryDay('');
    setAdvanceAmount('');
    setAdvanceDay('');
    setStep('matricula');
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
      <AnimatedBackground introPhase={introPhase} />

      {/* INTRO ANIMATION SEQUENCE */}
      <AnimatePresence mode="wait">
        {/* Phase 1: Logo Only - Otimizado */}
        {introPhase === 'logo' && (
          <motion.div
            key="intro-logo"
            className="relative z-10 flex flex-col items-center justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, y: -30 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Large INOVAFINANCE text */}
            <h1 className="font-display text-4xl md:text-5xl font-bold text-center text-foreground">
              INOVAFINANCE
            </h1>

            {/* Glowing underline simplificado */}
            <motion.div
              className="h-1 bg-gradient-to-r from-primary via-secondary to-emerald-400 rounded-full mt-3"
              initial={{ width: 0 }}
              animate={{ width: 150 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            />
          </motion.div>
        )}

        {/* Phase 2: Tagline - Otimizado */}
        {introPhase === 'tagline' && (
          <motion.div
            key="intro-tagline"
            className="relative z-10 flex flex-col items-center justify-center"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <p className="text-xl md:text-2xl text-muted-foreground text-center font-medium">
              Seu assistente financeiro inteligente
            </p>

            {/* Loading dots simplificados */}
            <div className="flex gap-2 mt-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{
                    y: [0, -6, 0],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 3: Full Content - Otimizado */}
        {introPhase === 'content' && (
          <motion.div
            key="intro-content"
            className="relative z-10 flex flex-col items-center w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Animated Piggy Bank Logo - Otimizado */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <div className="flex flex-col items-center justify-center gap-3 mb-3">
                <motion.div
                  className="relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                >
                  {/* Glow effect simplificado */}
                  <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-lg" />

                  {/* Main piggy container */}
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg overflow-hidden">
                    {/* Piggy face simplificado */}
                    <svg viewBox="0 0 64 64" className="w-14 h-14 relative z-10">
                      <circle cx="32" cy="32" r="22" fill="#fb7185" />
                      <ellipse cx="32" cy="40" rx="10" ry="7" fill="#fda4af" />
                      <circle cx="28" cy="40" r="2" fill="#be185d" />
                      <circle cx="36" cy="40" r="2" fill="#be185d" />
                      <circle cx="24" cy="28" r="4" fill="white" />
                      <circle cx="40" cy="28" r="4" fill="white" />
                    </svg>

                    {/* Coin falling simplificado - apenas 1 por vez */}
                    <motion.div
                      className="absolute w-3 h-3 rounded-full bg-yellow-400 shadow-sm"
                      initial={{ y: -30, opacity: 0 }}
                      animate={{
                        y: [-30, 10, 30],
                        opacity: [1, 1, 0]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeIn"
                      }}
                      style={{ top: '5px' }}
                    />
                  </div>
                </motion.div>

                {/* Bank name - removido animate-gradient para performance */}
                <motion.h1
                  className="font-display text-3xl font-bold text-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  INOVAFINANCE
                </motion.h1>
              </div>

              <motion.p
                className="text-muted-foreground text-xs md:text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Seu assistente financeiro inteligente
              </motion.p>
            </motion.div>

            {/* Login Form - Transições mais rápidas */}
            <AnimatePresence mode="wait">
              {step === 'matricula' && (
                <motion.div
                  key="matricula"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="w-full max-w-sm"
                >
                  <GlassCard className="p-6">
                    <h2 className="text-xl font-semibold text-center mb-2">
                      Digite sua matrícula
                    </h2>
                    <p className="text-muted-foreground text-sm text-center mb-6">
                      Use seu ID de 6 dígitos para acessar
                    </p>

                    {/* PIN Display */}
                    <div className="flex justify-center gap-2 mb-6">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className={`w-10 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-colors ${matricula[i]
                            ? 'border-primary bg-primary/20'
                            : 'border-border bg-muted/30'
                            }`}
                          animate={matricula[i] ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 0.2 }}
                        >
                          {matricula[i] || ''}
                        </motion.div>
                      ))}
                    </div>

                    <NumericKeypad
                      value={matricula}
                      onChange={setMatricula}
                      onSubmit={handleMatriculaSubmit}
                      maxLength={6}
                      autoSubmit={true}
                    />

                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-destructive text-sm text-center mt-4"
                      >
                        {error}
                      </motion.p>
                    )}

                    {isLoading && (
                      <div className="flex justify-center mt-4">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}

                    {/* Biometric Login Button */}
                    {biometricAvailable && biometricEnabled && (
                      <div className="mt-4">
                        <button
                          onClick={handleBiometricLogin}
                          disabled={isLoading}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-primary hover:opacity-90 transition-opacity text-white font-medium glow-primary"
                        >
                          <Fingerprint className="w-5 h-5" />
                          Entrar com biometria
                        </button>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Use sua digital ou Face ID
                        </p>
                      </div>
                    )}

                    {/* Botão de Assinatura */}
                    <div className="mt-6 pt-4 border-t border-border space-y-3">
                      <button
                        onClick={() => navigate('/subscribe')}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-primary hover:opacity-90 transition-opacity text-white font-medium glow-primary"
                      >
                        <CreditCard className="w-5 h-5" />
                        Assine agora
                      </button>
                      <button
                        onClick={() => navigate('/subscribe?trial=true')}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-emerald-400 font-medium"
                      >
                        <Calendar className="w-5 h-5" />
                        Teste grátis
                      </button>
                    </div>
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
                  className="w-full max-w-sm max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"
                >
                  <GlassCard className="p-6">
                    <h2 className="text-xl font-semibold text-center mb-1">
                      Criar conta
                    </h2>
                    <p className="text-muted-foreground text-xs text-center mb-6">
                      Complete seu cadastro para continuar
                    </p>

                    <div className="space-y-4">
                      {/* Campos do formulário com animações simplificadas ou removidas para performance */}
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
                            Número de telefone
                          </label>
                          <Input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(formatPhone(e.target.value))}
                            placeholder="(00) 00000-0000"
                            className="bg-muted/30 border-border h-10 text-sm"
                            maxLength={15}
                          />
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
                          {/* Limite Crédito */}
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

                          {/* Valor Disponível */}
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

                          {/* Dia Vencimento Crédito */}
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
                          {/* Valor do Salário */}
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

                          {/* Dia do Pagamento do Salário */}
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

                          {/* Valor do Adiantamento */}
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

                          {/* Dia do Adiantamento */}
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
                        onClick={() => {
                          setStep('matricula');
                          setError('');
                        }}
                        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Já tenho conta
                      </button>
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-destructive text-sm text-center mt-4"
                      >
                        {error}
                      </motion.p>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm"
                >
                  <GlassCard className="p-8 text-center">
                    {/* Pending Analysis Animation */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center"
                    >
                      <Shield className="w-10 h-10 text-white" />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h2 className="text-xl font-bold mb-2">
                        Cadastro enviado para análise
                      </h2>
                      <p className="text-muted-foreground text-sm mb-6">
                        Seu cadastro foi recebido e está aguardando aprovação do administrador.<br />
                        Assim que for aprovado, você poderá acessar todas as funcionalidades do INOVAFINANCE.
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mb-6"
                    >
                      <p className="text-sm text-muted-foreground mb-2">
                        Sua matrícula é:
                      </p>
                      <div className="flex justify-center gap-2">
                        {generatedMatricula.split('').map((digit, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.8 + i * 0.1, type: 'spring' }}
                            className="w-12 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                          >
                            {digit}
                          </motion.div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Guarde sua matrícula. Você usará ela para acessar sua conta após aprovação.
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.4 }}
                    >
                      <Button
                        onClick={handleGoToLogin}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90"
                      >
                        Entendi
                      </Button>
                    </motion.div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Pending Status Screen - when user tries to login */}
              {step === 'pending' && (
                <motion.div
                  key="pending"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm"
                >
                  <GlassCard className="p-8 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center"
                    >
                      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h2 className="text-xl font-bold mb-2">
                        ⏳ Conta em análise
                      </h2>
                      <p className="text-muted-foreground text-sm mb-6">
                        Seu cadastro ainda não foi aprovado pelo administrador.<br />
                        Aguarde a aprovação para acessar sua conta.
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button
                        onClick={() => setStep('matricula')}
                        variant="outline"
                        className="w-full"
                      >
                        Sair
                      </Button>
                    </motion.div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Rejected Status Screen */}
              {step === 'rejected' && (
                <motion.div
                  key="rejected"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm"
                >
                  <GlassCard className="p-8 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center"
                    >
                      <UserPlus className="w-10 h-10 text-white" />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <h2 className="text-xl font-bold mb-2 text-red-400">
                        ❌ Cadastro não aprovado
                      </h2>
                      <p className="text-muted-foreground text-sm mb-6">
                        Seu cadastro foi analisado e não foi aprovado.<br />
                        Entre em contato com o suporte para mais informações.
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Button
                        onClick={() => setStep('matricula')}
                        variant="outline"
                        className="w-full"
                      >
                        Voltar
                      </Button>
                    </motion.div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

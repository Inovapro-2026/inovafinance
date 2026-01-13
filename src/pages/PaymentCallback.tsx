import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Loader2, ArrowRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/GlassCard';

const SUPABASE_URL = "https://pahvovxnhqsmcnqncmys.supabase.co";

type PaymentStatus = 'loading' | 'approved' | 'pending' | 'rejected';

interface PaymentInfo {
  paymentStatus: string;
  matricula: number | null;
  userStatus: string | null;
  amount: number;
  fullName: string;
  isAffiliate: boolean;
}

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      // Get temp ID from URL or session storage
      const tempId = searchParams.get('temp_id') || sessionStorage.getItem('payment_temp_id');
      
      if (!tempId) {
        setError('ID de pagamento não encontrado');
        setStatus('rejected');
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/check-payment-status?temp_id=${tempId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar pagamento');
      }

      setPaymentInfo(data);

      // Map MP status to our status
      switch (data.paymentStatus) {
        case 'approved':
          setStatus('approved');
          break;
        case 'pending':
        case 'in_process':
          setStatus('pending');
          break;
        case 'rejected':
        case 'cancelled':
          setStatus('rejected');
          break;
        default:
          setStatus('pending');
      }

      // Clear session storage
      sessionStorage.removeItem('payment_temp_id');

    } catch (err: any) {
      console.error('Error checking payment:', err);
      setError(err.message);
      setStatus('rejected');
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      {/* Animated background */}
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

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="p-8 text-center">
            {status === 'loading' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Verificando pagamento...</h2>
                <p className="text-muted-foreground">
                  Aguarde enquanto confirmamos seu pagamento
                </p>
              </motion.div>
            )}

            {status === 'approved' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </motion.div>
                
                <h2 className="text-2xl font-bold mb-2 text-green-400">
                  Pagamento Confirmado!
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  Sua conta foi criada com sucesso e está aguardando aprovação do administrador.
                </p>

                {paymentInfo?.matricula && (
                  <div className="bg-background/50 rounded-lg p-4 mb-6">
                    <p className="text-sm text-muted-foreground mb-1">Sua matrícula</p>
                    <p className="text-3xl font-bold font-mono tracking-widest text-primary">
                      {paymentInfo.matricula}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Guarde este número para fazer login
                    </p>
                  </div>
                )}

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm text-yellow-400">
                    Aguardando aprovação
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Você será notificado quando sua conta for liberada
                  </p>
                </div>

                <Button
                  onClick={handleGoToLogin}
                  className="w-full bg-gradient-to-r from-primary to-accent"
                >
                  Ir para Login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}

            {status === 'pending' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Clock className="w-10 h-10 text-yellow-500" />
                </motion.div>
                
                <h2 className="text-2xl font-bold mb-2 text-yellow-400">
                  Pagamento Pendente
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  Seu pagamento está sendo processado. Assim que for confirmado, sua conta será criada automaticamente.
                </p>

                <p className="text-sm text-muted-foreground mb-6">
                  Isso pode levar alguns minutos. Verifique seu e-mail para mais informações.
                </p>

                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Voltar ao início
                </Button>
              </motion.div>
            )}

            {status === 'rejected' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <XCircle className="w-10 h-10 text-destructive" />
                </motion.div>
                
                <h2 className="text-2xl font-bold mb-2 text-destructive">
                  Pagamento não aprovado
                </h2>
                
                <p className="text-muted-foreground mb-6">
                  {error || 'Infelizmente seu pagamento não foi aprovado. Por favor, tente novamente com outro método de pagamento.'}
                </p>

                <Button
                  onClick={() => navigate('/subscribe')}
                  className="w-full bg-gradient-to-r from-primary to-accent"
                >
                  Tentar novamente
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}

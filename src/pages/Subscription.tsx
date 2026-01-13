import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  QrCode,
  Loader2,
  Copy,
  Check,
  History,
  Plus
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';

interface PaymentHistory {
  id: string;
  amount: number;
  payment_status: string;
  created_at: string;
}

interface PixData {
  qrCode: string | null;
  qrCodeBase64: string | null;
}

const SUPABASE_URL = "https://pahvovxnhqsmcnqncmys.supabase.co";

export default function Subscription() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    status: 'active' | 'pending' | 'expired' | 'suspended';
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number;
    blocked: boolean;
  } | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [subscriptionPrice, setSubscriptionPrice] = useState(49.99);
  
  // PIX modal
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedDays, setSelectedDays] = useState(30);

  useEffect(() => {
    if (user?.userId) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.userId) return;
    
    setIsLoading(true);
    try {
      // Load subscription info from users_matricula
      const { data: userData, error: userError } = await supabase
        .from('users_matricula')
        .select('subscription_start_date, subscription_end_date, subscription_status, blocked')
        .eq('matricula', user.userId)
        .single();

      if (userError) throw userError;

      let status: 'active' | 'pending' | 'expired' | 'suspended' = 'pending';
      let daysRemaining = 0;

      if (userData?.blocked) {
        status = 'suspended';
      } else if (userData?.subscription_end_date) {
        const endDate = new Date(userData.subscription_end_date);
        const now = new Date();
        daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining > 0) {
          status = 'active';
        } else {
          status = 'expired';
          daysRemaining = 0;
        }
      } else if (userData?.subscription_status === 'active') {
        status = 'active';
        daysRemaining = 30; // Default
      }

      setSubscriptionInfo({
        status,
        startDate: userData?.subscription_start_date || null,
        endDate: userData?.subscription_end_date || null,
        daysRemaining,
        blocked: userData?.blocked || false,
      });

      // Load payment history
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, payment_status, created_at')
        .eq('matricula', user.userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!paymentsError) {
        setPaymentHistory(payments || []);
      }

      // Load subscription price
      const { data: settings } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'subscription_price')
        .single();

      if (settings?.value) {
        setSubscriptionPrice(parseFloat(settings.value));
      }

    } catch (error) {
      console.error('Error loading subscription data:', error);
      toast.error('Erro ao carregar dados da assinatura');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePix = async (days: number) => {
    if (!user) return;

    setSelectedDays(days);
    setIsGeneratingPix(true);
    setShowPixModal(true);

    try {
      const amount = (subscriptionPrice / 30) * days;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-pix-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: user.fullName,
          email: user.email || null,
          phone: user.phone || '',
          cpf: '',
          renewalMatricula: user.userId,
          renewalDays: days,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar PIX');
      }

      setPixData(data.pix);
    } catch (error: any) {
      console.error('Error generating PIX:', error);
      toast.error(error.message || 'Erro ao gerar PIX');
      setShowPixModal(false);
    } finally {
      setIsGeneratingPix(false);
    }
  };

  const copyPixCode = async () => {
    if (pixData?.qrCode) {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const getStatusConfig = () => {
    switch (subscriptionInfo?.status) {
      case 'active':
        return { label: 'Ativo', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 };
      case 'suspended':
        return { label: 'Suspenso', color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertCircle };
      case 'expired':
        return { label: 'Expirado', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock };
      default:
        return { label: 'Pendente', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Clock };
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      className="min-h-screen pb-28 px-4 pt-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Assinatura</h1>
          <p className="text-muted-foreground text-sm">Gerencie seu plano</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-primary-foreground" />
        </div>
      </div>

      {/* Status Card */}
      <GlassCard className="p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${statusConfig.bg}`}>
            <StatusIcon className={`w-7 h-7 ${statusConfig.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            <h2 className="text-xl font-bold">Plano Premium</h2>
            <p className="text-muted-foreground text-sm">
              {formatCurrency(subscriptionPrice)}/mês
            </p>
          </div>
        </div>

        {/* Subscription details */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Data de Início</span>
            </div>
            <p className="font-bold">
              {subscriptionInfo?.startDate ? formatDate(subscriptionInfo.startDate) : '-'}
            </p>
          </div>
          <div className="p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Vencimento</span>
            </div>
            <p className="font-bold">
              {subscriptionInfo?.endDate ? formatDate(subscriptionInfo.endDate) : '-'}
            </p>
          </div>
        </div>

        {/* Days remaining */}
        {subscriptionInfo?.status === 'active' && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-emerald-600 font-medium">Dias restantes</span>
              <span className="text-2xl font-bold text-emerald-600">{subscriptionInfo.daysRemaining}</span>
            </div>
            {subscriptionInfo.daysRemaining <= 7 && (
              <p className="text-xs text-amber-500 mt-2">⚠️ Seu plano vence em breve. Renove agora!</p>
            )}
          </div>
        )}
      </GlassCard>

      {/* Actions */}
      <div className="space-y-3 mb-6">
        <h3 className="font-semibold text-lg">Ações</h3>
        
        {subscriptionInfo?.status === 'expired' || subscriptionInfo?.status === 'pending' ? (
          <Button onClick={() => generatePix(30)} className="w-full gap-2" size="lg">
            <QrCode className="w-5 h-5" />
            Reativar Assinatura (30 dias)
          </Button>
        ) : (
          <>
            <Button onClick={() => generatePix(30)} className="w-full gap-2" variant="outline">
              <RefreshCw className="w-4 h-4" />
              Renovar (+30 dias)
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => generatePix(60)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                +60 dias
              </Button>
              <Button onClick={() => generatePix(90)} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                +90 dias
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Payment History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold text-lg">Histórico de Pagamentos</h3>
        </div>
        
        {paymentHistory.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {paymentHistory.map((payment) => (
              <GlassCard key={payment.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(payment.created_at)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    payment.payment_status === 'approved' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : payment.payment_status === 'pending'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-red-500/10 text-red-500'
                  }`}>
                    {payment.payment_status === 'approved' ? 'Aprovado' : 
                     payment.payment_status === 'pending' ? 'Pendente' : 'Recusado'}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* PIX Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isGeneratingPix ? 'Gerando PIX...' : 'Pague com PIX'}
            </DialogTitle>
          </DialogHeader>
          
          {isGeneratingPix ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Preparando pagamento...</p>
            </div>
          ) : pixData ? (
            <div className="space-y-4">
              {pixData.qrCodeBase64 && (
                <div className="flex justify-center">
                  <img 
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 rounded-xl"
                  />
                </div>
              )}
              
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency((subscriptionPrice / 30) * selectedDays)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedDays} dias de assinatura
                </p>
              </div>

              {pixData.qrCode && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">Código PIX Copia e Cola:</p>
                  <div className="relative">
                    <div className="p-3 bg-muted rounded-lg text-xs font-mono break-all max-h-20 overflow-y-auto">
                      {pixData.qrCode}
                    </div>
                    <Button
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={copyPixCode}
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                O pagamento será confirmado automaticamente em alguns segundos.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

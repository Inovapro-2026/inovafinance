import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Crown,
  CreditCard,
  QrCode,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  History,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Plus
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PaymentHistory {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  payment_provider: string;
}

interface PixPaymentData {
  qrCode: string | null;
  qrCodeBase64: string | null;
  expirationDate: string | null;
}

const SUPABASE_URL = "https://pahvovxnhqsmcnqncmys.supabase.co";

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [subscriptionPrice, setSubscriptionPrice] = useState(49.99);
  
  // PIX Modal
  const [showPixModal, setShowPixModal] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);
  const [pixData, setPixData] = useState<PixPaymentData | null>(null);
  const [copied, setCopied] = useState(false);
  const [extensionDays, setExtensionDays] = useState(30);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'pix' && user) {
      handleGeneratePix();
    }
  }, [searchParams, user]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Load subscription data
      const { data: userData } = await supabase
        .from('users_matricula')
        .select('*')
        .eq('matricula', user.userId)
        .single();

      if (userData) {
        setSubscriptionData(userData);
      }

      // Load payment history
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('matricula', user.userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (payments) {
        setPaymentHistory(payments);
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
    }

    setIsLoading(false);
  };

  const handleGeneratePix = async (days: number = 30) => {
    if (!user) return;
    setExtensionDays(days);
    setIsGeneratingPix(true);
    setShowPixModal(true);

    try {
      // Calculate amount based on days
      const amount = (subscriptionPrice / 30) * days;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-pix-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: user.fullName,
          email: user.email,
          phone: user.phone || '',
          cpf: user.cpf || '',
          hasCreditCard: user.hasCreditCard,
          creditLimit: user.creditLimit || 0,
          creditDueDay: user.creditDueDay || 5,
          salaryAmount: user.salaryAmount || 0,
          salaryDay: user.salaryDay || 5,
          advanceAmount: user.advanceAmount || 0,
          advanceDay: user.advanceDay || null,
          affiliateCode: null,
          isRenewal: true,
          renewalDays: days,
          existingMatricula: user.userId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar PIX');
      }

      setPixData(data.pix);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível gerar o PIX.",
        variant: "destructive"
      });
      setShowPixModal(false);
    }

    setIsGeneratingPix(false);
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

  const getStatusInfo = () => {
    if (!subscriptionData) return { status: 'pending', label: 'Pendente', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    
    const endDate = subscriptionData.subscription_end_date ? new Date(subscriptionData.subscription_end_date) : null;
    const now = new Date();
    
    if (subscriptionData.user_status === 'pending') {
      return { status: 'pending', label: 'Pendente', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    } else if (endDate && endDate < now) {
      return { status: 'expired', label: 'Expirada', color: 'text-red-600', bg: 'bg-red-100' };
    }
    return { status: 'active', label: 'Ativa', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const getDaysRemaining = () => {
    if (!subscriptionData?.subscription_end_date) return 0;
    return Math.max(0, differenceInDays(new Date(subscriptionData.subscription_end_date), new Date()));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusInfo = getStatusInfo();
  const daysRemaining = getDaysRemaining();

  return (
    <motion.div
      className="min-h-screen pb-28 px-4 pt-6 bg-muted/30"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="font-display text-2xl font-bold">Assinatura</h1>
        <p className="text-muted-foreground text-sm">Gerencie seu plano</p>
      </motion.div>

      {/* Current Plan Card */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5 mb-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Crown className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">INOVAFINANCE Premium</h2>
                  <span className={`text-xs font-medium ${statusInfo.color} ${statusInfo.bg} px-2 py-0.5 rounded-full`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Valor mensal
                </p>
                <p className="font-bold text-lg">{formatCurrency(subscriptionPrice)}</p>
              </div>
              <div className="bg-background/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <QrCode className="w-3 h-3" />
                  Pagamento
                </p>
                <p className="font-bold text-lg">PIX</p>
              </div>
            </div>

            {subscriptionData?.subscription_start_date && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Início
                  </span>
                  <span className="font-medium">
                    {format(new Date(subscriptionData.subscription_start_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
                {subscriptionData.subscription_end_date && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Vencimento
                      </span>
                      <span className="font-medium">
                        {format(new Date(subscriptionData.subscription_end_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Dias restantes</span>
                      <span className={`font-bold ${daysRemaining < 7 ? 'text-destructive' : 'text-success'}`}>
                        {daysRemaining} dias
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Actions */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5 mb-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            Ações
          </h3>

          <div className="space-y-3">
            {statusInfo.status === 'expired' && (
              <Button
                className="w-full justify-between bg-primary text-primary-foreground"
                onClick={() => handleGeneratePix(30)}
              >
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Reativar assinatura (30 dias)
                </span>
                <span>{formatCurrency(subscriptionPrice)}</span>
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => handleGeneratePix(30)}
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Estender +30 dias
              </span>
              <span className="text-muted-foreground">{formatCurrency(subscriptionPrice)}</span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => handleGeneratePix(60)}
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Estender +60 dias
              </span>
              <span className="text-muted-foreground">{formatCurrency(subscriptionPrice * 2)}</span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => handleGeneratePix(90)}
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Estender +90 dias
              </span>
              <span className="text-muted-foreground">{formatCurrency(subscriptionPrice * 3)}</span>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => handleGeneratePix(30)}
            >
              <span className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Gerar novo PIX
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Payment History */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Histórico de Pagamentos
          </h3>

          {paymentHistory.length > 0 ? (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div 
                  key={payment.id}
                  className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      payment.status === 'approved' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {payment.status === 'approved' ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {payment.status === 'approved' ? 'Pagamento aprovado' : 'Aguardando pagamento'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pagamento encontrado
            </p>
          )}
        </GlassCard>
      </motion.div>

      {/* PIX Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Pagamento PIX
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código para pagar
            </DialogDescription>
          </DialogHeader>

          {isGeneratingPix ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Gerando PIX...</p>
            </div>
          ) : pixData ? (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency((subscriptionPrice / 30) * extensionDays)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {extensionDays} dias de assinatura
                </p>
              </div>

              {pixData.qrCodeBase64 && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl">
                    <img 
                      src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={copyPixCode}
                className="w-full"
                variant={copied ? "outline" : "default"}
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

              <p className="text-xs text-center text-muted-foreground">
                O pagamento será confirmado automaticamente em alguns segundos após a aprovação.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

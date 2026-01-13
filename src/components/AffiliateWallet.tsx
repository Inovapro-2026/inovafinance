import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, DollarSign, Clock, CheckCircle2, XCircle, Send, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/GlassCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Withdrawal {
  id: string;
  amount: number;
  pix_key: string | null;
  pix_key_type?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

interface AffiliateWalletProps {
  userId: number;
  affiliateBalance: number;
  onBalanceUpdate?: () => void;
}

const MIN_WITHDRAWAL = 40;

const statusConfig = {
  pending: { label: 'Em análise', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  approved: { label: 'Pago', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  rejected: { label: 'Recusado', icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-400/10' },
};

export function AffiliateWallet({ userId, affiliateBalance, onBalanceUpdate }: AffiliateWalletProps) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'email' | 'phone' | 'random'>('cpf');

  // Calculate pending balance (locked in pending withdrawals)
  const pendingBalance = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);

  const availableBalance = affiliateBalance - pendingBalance;

  useEffect(() => {
    loadWithdrawals();
  }, [userId]);

  const loadWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_withdrawals')
        .select('*')
        .eq('affiliate_matricula', userId)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setWithdrawals((data || []).map((w: any) => ({
        ...w,
        pix_key_type: w.pix_key_type || 'cpf',
        status: w.status as 'pending' | 'approved' | 'rejected'
      })));
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestWithdrawal = async () => {
    if (!pixKey.trim()) {
      toast.error('Digite sua chave PIX');
      return;
    }

    if (availableBalance < MIN_WITHDRAWAL) {
      toast.error(`Saldo mínimo para saque é R$ ${MIN_WITHDRAWAL},00`);
      return;
    }

    setIsSubmitting(true);

    try {
      // First, insert the withdrawal request
      const { data: withdrawal, error } = await supabase
        .from('affiliate_withdrawals')
        .insert({
          affiliate_matricula: userId,
          amount: availableBalance,
          pix_key: pixKey.trim(),
          pix_key_type: pixKeyType,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Process the withdrawal automatically via edge function
      toast.info('Processando seu saque via PIX...');
      
      try {
        const response = await fetch(`https://pahvovxnhqsmcnqncmys.supabase.co/functions/v1/process-affiliate-withdrawal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ withdrawalId: withdrawal.id }),
        });

        const result = await response.json();
        
        if (result.success) {
          toast.success('🎉 Saque processado! PIX enviado para sua conta.');
        } else {
          toast.info('Saque registrado. Será processado em breve.');
        }
      } catch (processError) {
        console.error('Error processing withdrawal:', processError);
        toast.info('Saque registrado. Será processado manualmente.');
      }

      setShowModal(false);
      setPixKey('');
      loadWithdrawals();
      onBalanceUpdate?.();
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      toast.error('Erro ao solicitar saque');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPixKey = (key: string, type: string) => {
    if (type === 'cpf') {
      return key.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (type === 'phone') {
      return key.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return key;
  };

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">Disponível</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            R$ {availableBalance.toFixed(2).replace('.', ',')}
          </p>
        </GlassCard>
        
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-muted-foreground">Pendente</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            R$ {pendingBalance.toFixed(2).replace('.', ',')}
          </p>
        </GlassCard>
      </div>

      {/* Minimum Info */}
      <div className="text-center text-sm text-muted-foreground">
        Valor mínimo para saque: <span className="font-semibold text-foreground">R$ {MIN_WITHDRAWAL},00</span>
      </div>

      {/* Withdraw Button */}
      <Button
        className="w-full h-12 text-lg bg-gradient-primary"
        onClick={() => setShowModal(true)}
        disabled={availableBalance < MIN_WITHDRAWAL}
      >
        <Send className="w-5 h-5 mr-2" />
        Solicitar Saque
      </Button>

      {availableBalance < MIN_WITHDRAWAL && (
        <p className="text-xs text-center text-muted-foreground">
          Você precisa de mais R$ {(MIN_WITHDRAWAL - availableBalance).toFixed(2).replace('.', ',')} para solicitar saque
        </p>
      )}

      {/* Withdrawals History */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">Histórico de Saques</h3>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : withdrawals.length === 0 ? (
          <GlassCard className="p-6 text-center">
            <DollarSign className="w-10 h-10 mx-auto text-muted/30 mb-2" />
            <p className="text-muted-foreground text-sm">Nenhum saque realizado</p>
          </GlassCard>
        ) : (
          withdrawals.map((withdrawal) => {
            const config = statusConfig[withdrawal.status];
            return (
              <GlassCard key={withdrawal.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bg, config.color)}>
                      <config.icon size={20} />
                    </div>
                    <div>
                      <p className="font-semibold">R$ {withdrawal.amount.toFixed(2).replace('.', ',')}</p>
                      <p className="text-xs text-muted-foreground">
                        PIX: {formatPixKey(withdrawal.pix_key, withdrawal.pix_key_type)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(withdrawal.requested_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className={cn("px-2 py-1 rounded-full text-xs font-bold", config.bg, config.color)}>
                    {config.label}
                  </div>
                </div>
                {withdrawal.notes && (
                  <p className="text-xs text-muted-foreground mt-2 pl-13">
                    Obs: {withdrawal.notes}
                  </p>
                )}
              </GlassCard>
            );
          })
        )}
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-background/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold">Solicitar Saque</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                  <X size={20} />
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Valor do saque</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    R$ {availableBalance.toFixed(2).replace('.', ',')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de chave PIX</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['cpf', 'email', 'phone', 'random'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={pixKeyType === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPixKeyType(type)}
                        className={pixKeyType === type ? 'bg-gradient-primary' : ''}
                      >
                        {type === 'cpf' && 'CPF'}
                        {type === 'email' && 'E-mail'}
                        {type === 'phone' && 'Celular'}
                        {type === 'random' && 'Aleatória'}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder={
                      pixKeyType === 'cpf' ? '000.000.000-00' :
                      pixKeyType === 'email' ? 'seu@email.com' :
                      pixKeyType === 'phone' ? '(00) 00000-0000' :
                      'Chave aleatória'
                    }
                    className="bg-muted/30"
                  />
                </div>

                <Button
                  className="w-full h-12 bg-gradient-primary"
                  onClick={handleRequestWithdrawal}
                  disabled={isSubmitting || !pixKey.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Confirmar Saque
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  O saque será processado em até 48 horas úteis após aprovação.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

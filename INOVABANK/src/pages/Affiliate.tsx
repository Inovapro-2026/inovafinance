import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, 
  Users, 
  DollarSign, 
  Copy, 
  Share2, 
  CheckCircle, 
  Clock, 
  XCircle,
  Link2,
  Wallet,
  TrendingUp,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AffiliateStats {
  totalInvites: number;
  pendingInvites: number;
  approvedInvites: number;
  rejectedInvites: number;
  totalCommission: number;
  availableBalance: number;
}

interface InviteHistory {
  id: string;
  invitedMatricula: number;
  invitedName: string | null;
  status: string;
  createdAt: string;
  commissionAmount: number;
  commissionStatus: string | null;
  releasedAt: string | null;
}

export default function Affiliate() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AffiliateStats>({
    totalInvites: 0,
    pendingInvites: 0,
    approvedInvites: 0,
    rejectedInvites: 0,
    totalCommission: 0,
    availableBalance: 0,
  });
  const [history, setHistory] = useState<InviteHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const affiliateCode = user?.userId?.toString() || '';
  const affiliateLink = `${window.location.origin}/subscribe?ref=${affiliateCode}`;

  useEffect(() => {
    if (user) {
      loadAffiliateData();
    }
  }, [user]);

  const loadAffiliateData = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch invites
      const { data: invites, error: invitesError } = await supabase
        .from('affiliate_invites')
        .select(`
          id,
          invited_matricula,
          status,
          created_at
        `)
        .eq('inviter_matricula', user.userId)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      // Fetch commissions
      const { data: commissions, error: commissionsError } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_matricula', user.userId);

      if (commissionsError) throw commissionsError;

      // Fetch invited users' names
      const invitedMatriculas = invites?.map(i => i.invited_matricula) || [];
      let invitedUsers: Record<number, string> = {};
      
      if (invitedMatriculas.length > 0) {
        const { data: users } = await supabase
          .from('users_matricula')
          .select('matricula, full_name')
          .in('matricula', invitedMatriculas);
        
        users?.forEach(u => {
          invitedUsers[u.matricula] = u.full_name || `#${u.matricula}`;
        });
      }

      // Calculate stats
      const pending = invites?.filter(i => i.status === 'pending').length || 0;
      const approved = invites?.filter(i => i.status === 'approved').length || 0;
      const rejected = invites?.filter(i => i.status === 'rejected').length || 0;
      const totalCommission = commissions?.reduce((acc, c) => acc + Number(c.amount), 0) || 0;
      const availableBalance = commissions
        ?.filter(c => c.status === 'released')
        .reduce((acc, c) => acc + Number(c.amount), 0) || 0;

      setStats({
        totalInvites: invites?.length || 0,
        pendingInvites: pending,
        approvedInvites: approved,
        rejectedInvites: rejected,
        totalCommission,
        availableBalance,
      });

      // Build history
      const historyData: InviteHistory[] = (invites || []).map(invite => {
        const commission = commissions?.find(c => c.invited_matricula === invite.invited_matricula);
        return {
          id: invite.id,
          invitedMatricula: invite.invited_matricula,
          invitedName: invitedUsers[invite.invited_matricula] || `Matrícula ${invite.invited_matricula}`,
          status: invite.status,
          createdAt: invite.created_at,
          commissionAmount: Number(commission?.amount) || 0,
          commissionStatus: commission?.status || null,
          releasedAt: commission?.released_at || null,
        };
      });

      setHistory(historyData);
    } catch (error) {
      console.error('Error loading affiliate data:', error);
      toast.error('Erro ao carregar dados de afiliado');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(affiliateCode);
      setCopiedCode(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopiedLink(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const shareLink = async (platform: 'whatsapp' | 'telegram' | 'generic') => {
    const message = `🚀 Conheça o INOVAFINANCE - seu gestor financeiro inteligente!\n\nUse meu link e ganhe desconto na assinatura:\n${affiliateLink}`;
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(affiliateLink)}&text=${encodeURIComponent(message)}`,
      generic: '',
    };

    if (platform === 'generic' && navigator.share) {
      try {
        await navigator.share({
          title: 'INOVAFINANCE - Indique e Ganhe',
          text: message,
          url: affiliateLink,
        });
      } catch {
        // User cancelled or error
      }
    } else if (urls[platform]) {
      window.open(urls[platform], '_blank');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-success/20 text-success">
            <CheckCircle className="w-3 h-3" />
            Aprovado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-warning/20 text-warning">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-destructive/20 text-destructive">
            <XCircle className="w-3 h-3" />
            Rejeitado
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen pb-28 px-4 pt-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Indique e Ganhe</h1>
          <p className="text-muted-foreground text-sm">
            Convide amigos e ganhe comissões reais
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
          <Gift className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Highlight Banner */}
      <GlassCard className="p-4 mb-6 border-l-4 border-l-success">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="font-bold text-sm mb-1">💰 Comissão liberada automaticamente!</p>
            <p className="text-xs text-muted-foreground">
              Ganhe comissões reais por cada assinatura confirmada via seu link ou código.
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Code Section */}
      <GlassCard className="p-5 mb-4">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">1</span>
          Seu código de indicação
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted/50 rounded-xl px-4 py-3 font-mono text-2xl font-bold text-primary text-center">
            {affiliateCode}
          </div>
          <Button
            onClick={copyCode}
            variant="outline"
            className="h-12 px-4"
          >
            {copiedCode ? <CheckCircle className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
          </Button>
        </div>
      </GlassCard>

      {/* Link Section */}
      <GlassCard className="p-5 mb-6">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">2</span>
          Seu link de indicação
        </h3>
        <div className="bg-muted/50 rounded-xl px-4 py-3 mb-3 overflow-hidden">
          <p className="text-xs text-muted-foreground mb-1">Link exclusivo:</p>
          <p className="font-mono text-sm text-primary truncate">{affiliateLink}</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={copyLink}
            variant="outline"
            className="flex-1"
          >
            {copiedLink ? <CheckCircle className="w-4 h-4 mr-2 text-success" /> : <Copy className="w-4 h-4 mr-2" />}
            Copiar link
          </Button>
          <Button
            onClick={() => shareLink('whatsapp')}
            className="bg-green-600 hover:bg-green-700"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => shareLink('telegram')}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </GlassCard>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.totalInvites}</p>
            <p className="text-xs text-muted-foreground">Total de convites</p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
            </div>
            <p className="text-2xl font-bold text-warning">{stats.pendingInvites}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="text-2xl font-bold text-success">{stats.approvedInvites}</p>
            <p className="text-xs text-muted-foreground">Aprovados</p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.rejectedInvites}</p>
            <p className="text-xs text-muted-foreground">Rejeitados</p>
          </GlassCard>
        </motion.div>
      </div>

      {/* Commission Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-secondary" />
              </div>
            </div>
            <p className="text-xl font-bold text-secondary">{formatCurrency(stats.totalCommission)}</p>
            <p className="text-xs text-muted-foreground">Comissão total</p>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <GlassCard className="p-4 border-2 border-success/30">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="text-xl font-bold text-success">{formatCurrency(stats.availableBalance)}</p>
            <p className="text-xs text-muted-foreground">Saldo disponível</p>
          </GlassCard>
        </motion.div>
      </div>

      {/* History */}
      <GlassCard className="p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Histórico de indicações
        </h3>

        {history.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-bold mb-1">Nenhuma indicação ainda</p>
            <p className="text-sm text-muted-foreground">
              Compartilhe seu link e comece a ganhar!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-muted/30 rounded-xl"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm">{item.invitedName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
                {item.commissionAmount > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Comissão</p>
                    <p className={`font-bold text-sm ${
                      item.commissionStatus === 'released' ? 'text-success' : 'text-warning'
                    }`}>
                      {formatCurrency(item.commissionAmount)}
                      {item.commissionStatus === 'released' ? ' ✓' : ' (pendente)'}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

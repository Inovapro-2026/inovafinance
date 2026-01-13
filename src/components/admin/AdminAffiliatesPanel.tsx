import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AdminAffiliateSettings } from "./AdminAffiliateSettings";
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  Search, 
  Loader2, 
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ArrowUpRight,
  History,
  Settings,
  CreditCard
} from "lucide-react";

interface AffiliateUser {
  matricula: number;
  full_name: string;
  affiliate_balance: number;
  is_affiliate: boolean;
  created_at: string;
}

interface Commission {
  id: string;
  affiliate_matricula: number;
  invited_matricula: number;
  amount: number;
  status: string;
  created_at: string;
  released_at: string | null;
  affiliate_user?: { full_name: string };
  invited_user?: { full_name: string };
}

interface Withdrawal {
  id: string;
  affiliate_matricula: number;
  amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  pix_key: string | null;
  affiliate_user?: { full_name: string };
}

export function AdminAffiliatesPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const [affiliates, setAffiliates] = useState<AffiliateUser[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    totalCommissionsPaid: 0,
    pendingWithdrawals: 0,
    totalIndicados: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load affiliates
      const { data: affiliatesData } = await supabase
        .from('users_matricula')
        .select('matricula, full_name, affiliate_balance, is_affiliate, created_at')
        .eq('is_affiliate', true)
        .order('created_at', { ascending: false });

      setAffiliates((affiliatesData as AffiliateUser[]) || []);

      // Load commissions with related users
      const { data: commissionsData } = await (supabase as any)
        .from('affiliate_commissions')
        .select(`
          *,
          affiliate_user:users_matricula!affiliate_matricula(full_name),
          invited_user:users_matricula!invited_matricula(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      setCommissions((commissionsData as Commission[]) || []);

      // Load withdrawals
      const { data: withdrawalsData } = await (supabase as any)
        .from('affiliate_withdrawals')
        .select(`
          *,
          affiliate_user:users_matricula!affiliate_matricula(full_name)
        `)
        .order('requested_at', { ascending: false });

      setWithdrawals((withdrawalsData as Withdrawal[]) || []);

      // Calculate stats
      const totalAffiliates = affiliatesData?.length || 0;
      const totalCommissionsPaid = commissionsData
        ?.filter((c: Commission) => c.status === 'released')
        .reduce((sum: number, c: Commission) => sum + Number(c.amount), 0) || 0;
      const pendingWithdrawals = withdrawalsData
        ?.filter((w: Withdrawal) => w.status === 'pending').length || 0;
      const totalIndicados = commissionsData?.length || 0;

      setStats({
        totalAffiliates,
        totalCommissionsPaid,
        pendingWithdrawals,
        totalIndicados
      });

    } catch (error) {
      console.error('Error loading affiliate data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de afiliados.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'pay' | 'cancel') => {
    setProcessingId(withdrawalId);
    try {
      const statusMap = {
        'approve': 'approved',
        'pay': 'paid',
        'cancel': 'cancelled'
      };

      const { error } = await supabase
        .from('affiliate_withdrawals')
        .update({
          status: statusMap[action],
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: action === 'pay' 
          ? "Saque marcado como pago." 
          : action === 'approve' 
            ? "Saque aprovado."
            : "Saque cancelado."
      });

      loadData();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a solicitação.",
        variant: "destructive"
      });
    }
    setProcessingId(null);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      'pending': { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pendente' },
      'approved': { color: 'bg-blue-500/20 text-blue-400', label: 'Aprovado' },
      'paid': { color: 'bg-emerald-500/20 text-emerald-400', label: 'Pago' },
      'cancelled': { color: 'bg-red-500/20 text-red-400', label: 'Cancelado' },
      'released': { color: 'bg-emerald-500/20 text-emerald-400', label: 'Liberada' },
      'locked': { color: 'bg-slate-500/20 text-slate-400', label: 'Bloqueada' }
    };
    const { color, label } = config[status] || config['pending'];
    return <Badge className={`${color} border-0`}>{label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Afiliados</p>
                <p className="text-2xl font-bold text-purple-400">{stats.totalAffiliates}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total em Comissões</p>
                <p className="text-2xl font-bold text-emerald-400">
                  R$ {stats.totalCommissionsPaid.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Saques Pendentes</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pendingWithdrawals}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Indicados</p>
                <p className="text-2xl font-bold text-blue-400">{stats.totalIndicados}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary">
            <Users className="w-4 h-4 mr-2" />
            Afiliados
          </TabsTrigger>
          <TabsTrigger value="commissions" className="data-[state=active]:bg-primary">
            <DollarSign className="w-4 h-4 mr-2" />
            Comissões
          </TabsTrigger>
          <TabsTrigger value="withdrawals" className="data-[state=active]:bg-primary">
            <CreditCard className="w-4 h-4 mr-2" />
            Saques
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-primary">
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        {/* Affiliates List */}
        <TabsContent value="overview" className="mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">Lista de Afiliados</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {affiliates
                  .filter(a => 
                    a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    a.matricula.toString().includes(searchTerm)
                  )
                  .map((affiliate) => (
                    <div 
                      key={affiliate.matricula}
                      className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{affiliate.full_name || 'Sem nome'}</p>
                          <p className="text-xs text-slate-400">Matrícula: {affiliate.matricula}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-bold">
                          R$ {(affiliate.affiliate_balance || 0).toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-xs text-slate-400">Saldo disponível</p>
                      </div>
                    </div>
                  ))}
                {affiliates.length === 0 && (
                  <p className="text-center text-slate-400 py-8">Nenhum afiliado encontrado.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions List */}
        <TabsContent value="commissions" className="mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Histórico de Comissões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {commissions.map((commission) => (
                  <div 
                    key={commission.id}
                    className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {commission.affiliate_user?.full_name || `#${commission.affiliate_matricula}`}
                        </p>
                        <p className="text-xs text-slate-400">
                          Indicou: {commission.invited_user?.full_name || `#${commission.invited_matricula}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(commission.status)}
                      <div className="text-right">
                        <p className="text-emerald-400 font-bold">
                          R$ {Number(commission.amount).toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(commission.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {commissions.length === 0 && (
                  <p className="text-center text-slate-400 py-8">Nenhuma comissão registrada.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawals List */}
        <TabsContent value="withdrawals" className="mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white">Solicitações de Saque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {withdrawals.map((withdrawal) => (
                  <div 
                    key={withdrawal.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-700/50 rounded-lg gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {withdrawal.affiliate_user?.full_name || `#${withdrawal.affiliate_matricula}`}
                        </p>
                        <p className="text-xs text-slate-400">
                          PIX: {withdrawal.pix_key || 'Não informado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(withdrawal.status)}
                      <div className="text-right">
                        <p className="text-blue-400 font-bold">
                          R$ {Number(withdrawal.amount).toFixed(2).replace('.', ',')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(withdrawal.requested_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    {withdrawal.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          onClick={() => handleWithdrawalAction(withdrawal.id, 'cancel')}
                          disabled={processingId === withdrawal.id}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleWithdrawalAction(withdrawal.id, 'pay')}
                          disabled={processingId === withdrawal.id}
                        >
                          {processingId === withdrawal.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-1" />
                          )}
                          Pagar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {withdrawals.length === 0 && (
                  <p className="text-center text-slate-400 py-8">Nenhuma solicitação de saque.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="mt-4">
          <AdminAffiliateSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

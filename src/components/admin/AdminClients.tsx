import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  getAllUsers, 
  updateUser, 
  toggleUserBlock, 
  deleteUser, 
  addAdminLog,
  getUserTransactions,
  getUserScheduledPayments,
  getUserPaymentLogs,
  AdminUser 
} from "@/lib/adminDb";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  Wallet,
  Edit,
  Ban,
  Unlock,
  Trash2,
  Eye,
  Loader2,
  DollarSign,
  CalendarDays,
  Receipt,
  UserPlus,
  Filter,
  Download,
  CreditCard,
  Users,
  UserX,
  SortAsc,
  SortDesc,
  UserCheck,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Calendar
} from "lucide-react";

type SortField = 'full_name' | 'created_at' | 'initial_balance';
type SortOrder = 'asc' | 'desc';
type FilterStatus = 'all' | 'active' | 'blocked' | 'pending' | 'expired';

export function AdminClients() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planAction, setPlanAction] = useState<'activate' | 'renew' | 'suspend'>('activate');
  const [renewDays, setRenewDays] = useState(30);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [userDetails, setUserDetails] = useState<{
    transactions: Array<Record<string, unknown>>;
    scheduledPayments: Array<Record<string, unknown>>;
    paymentLogs: Array<Record<string, unknown>>;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    salary_amount: "",
    salary_day: "",
    advance_amount: "",
    advance_day: "",
    initial_balance: "",
    credit_limit: "",
    has_credit_card: false,
    is_affiliate: false
  });
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [searchQuery, users, filterStatus, sortField, sortOrder]);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setFilteredUsers(data);
    setIsLoading(false);
  };

  const filterAndSortUsers = () => {
    let filtered = [...users];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.full_name?.toLowerCase().includes(query)) ||
        (user.email?.toLowerCase().includes(query)) ||
        (user.phone?.includes(query)) ||
        (user.matricula.toString().includes(query))
      );
    }

    if (filterStatus === 'active') {
      filtered = filtered.filter(user => !user.blocked && user.subscription_status === 'active');
    } else if (filterStatus === 'blocked') {
      filtered = filtered.filter(user => user.blocked);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(user => user.subscription_status === 'pending' || !user.subscription_status);
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(user => {
        if (!user.subscription_end_date) return false;
        return new Date(user.subscription_end_date) < new Date();
      });
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'full_name':
          comparison = (a.full_name || '').localeCompare(b.full_name || '');
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'initial_balance':
          comparison = (a.initial_balance || 0) - (b.initial_balance || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredUsers(filtered);
  };

  const handleEdit = (user: AdminUser) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      salary_amount: user.salary_amount?.toString() || "",
      salary_day: user.salary_day?.toString() || "",
      advance_amount: user.advance_amount?.toString() || "",
      advance_day: user.advance_day?.toString() || "",
      initial_balance: user.initial_balance?.toString() || "",
      credit_limit: user.credit_limit?.toString() || "",
      has_credit_card: false,
      is_affiliate: user.is_affiliate || false
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    const updates: Partial<AdminUser> = {
      full_name: editForm.full_name || null,
      email: editForm.email || null,
      phone: editForm.phone || null,
      salary_amount: editForm.salary_amount ? parseFloat(editForm.salary_amount) : null,
      salary_day: editForm.salary_day ? parseInt(editForm.salary_day) : null,
      advance_amount: editForm.advance_amount ? parseFloat(editForm.advance_amount) : null,
      advance_day: editForm.advance_day ? parseInt(editForm.advance_day) : null,
      initial_balance: editForm.initial_balance ? parseFloat(editForm.initial_balance) : null,
      credit_limit: editForm.credit_limit ? parseFloat(editForm.credit_limit) : null,
      is_affiliate: editForm.is_affiliate
    };

    const success = await updateUser(selectedUser.id, updates);
    if (success) {
      await addAdminLog('edit_user', selectedUser.id, { updates });
      toast({
        title: "Usuário atualizado",
        description: "Os dados do cliente foram atualizados com sucesso."
      });
      loadUsers();
      setShowEditModal(false);
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive"
      });
    }
  };

  const handlePlanAction = (user: AdminUser, action: 'activate' | 'renew' | 'suspend') => {
    setSelectedUser(user);
    setPlanAction(action);
    setRenewDays(30);
    setShowPlanModal(true);
  };

  const executePlanAction = async () => {
    if (!selectedUser) return;

    try {
      let updates: Record<string, unknown> = {};
      let logAction = '';
      let logDetails: Record<string, unknown> = {};

      const now = new Date();
      
      switch (planAction) {
        case 'activate':
          const activateEndDate = new Date();
          activateEndDate.setDate(activateEndDate.getDate() + renewDays);
          updates = {
            subscription_status: 'active',
            subscription_start_date: now.toISOString(),
            subscription_end_date: activateEndDate.toISOString(),
            blocked: false,
            user_status: 'approved'
          };
          logAction = 'activate_plan';
          logDetails = { days: renewDays, end_date: activateEndDate.toISOString() };
          break;
          
        case 'renew':
          const currentEndDate = selectedUser.subscription_end_date 
            ? new Date(selectedUser.subscription_end_date)
            : new Date();
          if (currentEndDate < now) {
            currentEndDate.setTime(now.getTime());
          }
          currentEndDate.setDate(currentEndDate.getDate() + renewDays);
          updates = {
            subscription_status: 'active',
            subscription_end_date: currentEndDate.toISOString(),
            blocked: false
          };
          logAction = 'renew_plan';
          logDetails = { days: renewDays, new_end_date: currentEndDate.toISOString() };
          break;
          
        case 'suspend':
          updates = {
            subscription_status: 'suspended',
            blocked: true
          };
          logAction = 'suspend_plan';
          logDetails = { reason: 'Admin action' };
          break;
      }

      const { error } = await supabase
        .from('users_matricula')
        .update(updates)
        .eq('id', selectedUser.id);

      if (error) throw error;

      await addAdminLog(logAction, selectedUser.id, logDetails);

      toast({
        title: planAction === 'suspend' ? 'Plano suspenso' : 'Plano atualizado',
        description: planAction === 'activate' 
          ? `Plano ativado por ${renewDays} dias`
          : planAction === 'renew'
            ? `Plano renovado por +${renewDays} dias`
            : 'O plano do usuário foi suspenso'
      });

      loadUsers();
      setShowPlanModal(false);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o plano",
        variant: "destructive"
      });
    }
  };

  const handleToggleAffiliate = async (user: AdminUser) => {
    const newAffiliateState = !user.is_affiliate;
    const success = await updateUser(user.id, { is_affiliate: newAffiliateState });
    
    if (success) {
      await addAdminLog(newAffiliateState ? 'enable_affiliate' : 'disable_affiliate', user.id);
      toast({
        title: newAffiliateState ? "Afiliado ativado" : "Afiliado desativado",
        description: `O modo afiliado de ${user.full_name || 'cliente'} foi ${newAffiliateState ? 'ativado' : 'desativado'}.`
      });
      loadUsers();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status de afiliado.",
        variant: "destructive"
      });
    }
  };

  const handleToggleBlock = async (user: AdminUser) => {
    const newBlockedState = !user.blocked;
    const success = await toggleUserBlock(user.id, newBlockedState);
    
    if (success) {
      await addAdminLog(newBlockedState ? 'block_user' : 'unblock_user', user.id);
      toast({
        title: newBlockedState ? "Conta bloqueada" : "Conta desbloqueada",
        description: `A conta de ${user.full_name || 'cliente'} foi ${newBlockedState ? 'bloqueada' : 'desbloqueada'}.`
      });
      loadUsers();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da conta.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = (user: AdminUser) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    const success = await deleteUser(selectedUser.id, selectedUser.matricula);
    if (success) {
      await addAdminLog('delete_user', selectedUser.id, { 
        deleted_user: selectedUser.full_name,
        matricula: selectedUser.matricula 
      });
      toast({
        title: "Conta excluída",
        description: "A conta do cliente foi excluída permanentemente."
      });
      loadUsers();
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta.",
        variant: "destructive"
      });
    }
    setShowDeleteDialog(false);
  };

  const handleViewDetails = async (user: AdminUser) => {
    setSelectedUser(user);
    const [transactions, scheduledPayments, paymentLogs] = await Promise.all([
      getUserTransactions(user.matricula),
      getUserScheduledPayments(user.matricula),
      getUserPaymentLogs(user.matricula)
    ]);
    setUserDetails({ transactions, scheduledPayments, paymentLogs });
    setShowDetailsModal(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getSubscriptionBadge = (user: AdminUser) => {
    if (user.blocked) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">Suspenso</span>;
    }
    if (!user.subscription_status || user.subscription_status === 'pending') {
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">Pendente</span>;
    }
    if (user.subscription_end_date && new Date(user.subscription_end_date) < new Date()) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">Vencido</span>;
    }
    if (user.subscription_status === 'active') {
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">Ativo</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-500/20 text-slate-400">{user.subscription_status}</span>;
  };

  const exportToCSV = () => {
    const headers = ['Matrícula', 'Nome', 'Email', 'Telefone', 'Saldo', 'Status', 'Plano'];
    const rows = filteredUsers.map(user => [
      user.matricula,
      user.full_name || '',
      user.email || '',
      user.phone || '',
      user.initial_balance || 0,
      user.blocked ? 'Bloqueado' : 'Ativo',
      user.subscription_status || 'pending'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exportado!",
      description: "Lista de clientes exportada com sucesso."
    });
  };

  const statsCards = [
    { label: 'Total de Clientes', value: users.length, icon: Users, color: 'text-blue-400' },
    { label: 'Planos Ativos', value: users.filter(u => u.subscription_status === 'active' && !u.blocked).length, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Pendentes', value: users.filter(u => !u.subscription_status || u.subscription_status === 'pending').length, icon: RefreshCw, color: 'text-amber-400' },
    { label: 'Suspensos', value: users.filter(u => u.blocked).length, icon: XCircle, color: 'text-red-400' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-700/50 flex items-center justify-center">
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                  <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail, telefone ou matrícula..."
            className="pl-10 bg-slate-800/50 border-slate-700 text-white"
          />
        </div>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="expired">Vencidos</SelectItem>
            <SelectItem value="blocked">Suspensos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="created_at">Data de Cadastro</SelectItem>
            <SelectItem value="full_name">Nome</SelectItem>
            <SelectItem value="initial_balance">Saldo</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="text-slate-400 hover:text-white"
        >
          {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
        </Button>

        <Button
          variant="outline"
          onClick={exportToCSV}
          className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.02 }}
            >
              <Card className={`bg-slate-800/50 border-slate-700 ${user.blocked ? 'border-red-500/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4">
                    {/* User Info Row */}
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="text-white font-semibold truncate block">{user.full_name || 'Sem nome'}</span>
                            <span className="text-xs text-slate-500">#{user.matricula}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300 text-sm truncate">{user.email || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300 text-sm">
                            Venc: {formatDate(user.subscription_end_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-slate-400" />
                          <span className="text-emerald-400 font-bold">
                            {formatCurrency(user.initial_balance || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSubscriptionBadge(user)}
                        {user.is_affiliate && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400">
                            Afiliado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700">
                      {/* Plan Actions */}
                      <div className="flex gap-1 mr-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePlanAction(user, 'activate')}
                          className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Ativar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePlanAction(user, 'renew')}
                          className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 text-xs"
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Renovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePlanAction(user, 'suspend')}
                          className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Suspender
                        </Button>
                      </div>

                      <div className="h-6 w-px bg-slate-700 mx-1" />

                      {/* Other Actions */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDetails(user)}
                        className="text-slate-400 hover:text-white"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(user)}
                        className="text-slate-400 hover:text-blue-400"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleAffiliate(user)}
                        className={user.is_affiliate ? "text-purple-400 hover:text-purple-300" : "text-slate-400 hover:text-purple-400"}
                        title={user.is_affiliate ? "Desativar afiliado" : "Ativar afiliado"}
                      >
                        <UserCheck className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleBlock(user)}
                        className={user.blocked ? "text-emerald-400 hover:text-emerald-300" : "text-orange-400 hover:text-orange-300"}
                        title={user.blocked ? "Desbloquear" : "Bloquear"}
                      >
                        {user.blocked ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(user)}
                        className="text-red-400 hover:text-red-300"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      {/* Plan Action Modal */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {planAction === 'activate' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {planAction === 'renew' && <RefreshCw className="w-5 h-5 text-blue-400" />}
              {planAction === 'suspend' && <XCircle className="w-5 h-5 text-red-400" />}
              {planAction === 'activate' ? 'Ativar Plano' : planAction === 'renew' ? 'Renovar Plano' : 'Suspender Plano'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedUser?.full_name || `Matrícula #${selectedUser?.matricula}`}
            </DialogDescription>
          </DialogHeader>

          {planAction !== 'suspend' ? (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm text-slate-300 mb-2 block">Período (dias)</label>
                <div className="flex gap-2">
                  {[30, 60, 90, 180, 365].map((days) => (
                    <Button
                      key={days}
                      variant={renewDays === days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRenewDays(days)}
                      className={renewDays === days ? '' : 'bg-slate-700 border-slate-600 text-white'}
                    >
                      {days}d
                    </Button>
                  ))}
                </div>
              </div>

              {planAction === 'renew' && selectedUser?.subscription_end_date && (
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-400">Vencimento atual</p>
                  <p className="text-white font-medium">{formatDate(selectedUser.subscription_end_date)}</p>
                  <p className="text-xs text-emerald-400 mt-1">
                    Novo vencimento: {formatDate(
                      new Date(
                        Math.max(
                          new Date(selectedUser.subscription_end_date).getTime(),
                          Date.now()
                        ) + renewDays * 24 * 60 * 60 * 1000
                      ).toISOString()
                    )}
                  </p>
                </div>
              )}

              {planAction === 'activate' && (
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-400">Início</p>
                  <p className="text-white font-medium">Hoje ({formatDate(new Date().toISOString())})</p>
                  <p className="text-xs text-emerald-400 mt-1">
                    Vencimento: {formatDate(
                      new Date(Date.now() + renewDays * 24 * 60 * 60 * 1000).toISOString()
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4">
              <p className="text-slate-300">
                O usuário perderá acesso às funcionalidades do sistema, mas ainda poderá acessar o suporte.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPlanModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={executePlanAction}
              className={
                planAction === 'suspend' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : planAction === 'renew' 
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
              }
            >
              {planAction === 'activate' ? 'Ativar Plano' : planAction === 'renew' ? 'Renovar Plano' : 'Suspender Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription className="text-slate-400">
              Altere os dados do cliente abaixo.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="bg-slate-700 w-full">
              <TabsTrigger value="personal" className="flex-1">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="financial" className="flex-1">Financeiro</TabsTrigger>
              <TabsTrigger value="affiliate" className="flex-1">Afiliado</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-slate-300">Nome completo</label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">E-mail</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300">Telefone</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </TabsContent>
            <TabsContent value="financial" className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-slate-300">Saldo Inicial (R$)</label>
                <Input
                  type="number"
                  value={editForm.initial_balance}
                  onChange={(e) => setEditForm({ ...editForm, initial_balance: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300">Salário (R$)</label>
                  <Input
                    type="number"
                    value={editForm.salary_amount}
                    onChange={(e) => setEditForm({ ...editForm, salary_amount: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Dia do salário</label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.salary_day}
                    onChange={(e) => setEditForm({ ...editForm, salary_day: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300">Adiantamento (R$)</label>
                  <Input
                    type="number"
                    value={editForm.advance_amount}
                    onChange={(e) => setEditForm({ ...editForm, advance_amount: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Dia do adiantamento</label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.advance_day}
                    onChange={(e) => setEditForm({ ...editForm, advance_day: e.target.value })}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-300">Limite de Crédito (R$)</label>
                <Input
                  type="number"
                  value={editForm.credit_limit}
                  onChange={(e) => setEditForm({ ...editForm, credit_limit: e.target.value })}
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </TabsContent>
            <TabsContent value="affiliate" className="space-y-4 mt-4">
              <Card className="bg-slate-700/50 border-slate-600">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-white font-medium">Modo Afiliado</Label>
                      <p className="text-xs text-slate-400">
                        Ao ativar, o usuário poderá indicar novos clientes e receber comissões.
                      </p>
                    </div>
                    <Switch
                      checked={editForm.is_affiliate}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, is_affiliate: checked })}
                    />
                  </div>
                  
                  {editForm.is_affiliate && selectedUser && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-4 border-t border-slate-600"
                    >
                      <div className="p-3 bg-slate-800 rounded-lg">
                        <p className="text-xs text-slate-400">Link de indicação:</p>
                        <p className="text-sm text-purple-400 font-mono">
                          /subscribe?ref={selectedUser.matricula}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {selectedUser?.full_name || 'Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && userDetails && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="bg-slate-700 w-full">
                <TabsTrigger value="info" className="flex-1">Informações</TabsTrigger>
                <TabsTrigger value="subscription" className="flex-1">Plano</TabsTrigger>
                <TabsTrigger value="transactions" className="flex-1">Transações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="mt-4">
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400">Matrícula</p>
                      <p className="text-white font-bold">{selectedUser.matricula}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">E-mail</p>
                      <p className="text-white">{selectedUser.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Telefone</p>
                      <p className="text-white">{selectedUser.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Saldo Inicial</p>
                      <p className="text-emerald-400 font-bold">
                        {formatCurrency(selectedUser.initial_balance || 0)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscription" className="mt-4">
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400">Status do Plano</p>
                        <div className="mt-1">{getSubscriptionBadge(selectedUser)}</div>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Vencimento</p>
                        <p className="text-white font-bold">{formatDate(selectedUser.subscription_end_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Início</p>
                        <p className="text-white">{formatDate(selectedUser.subscription_start_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Status da Conta</p>
                        <p className={selectedUser.blocked ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {selectedUser.blocked ? 'Bloqueada' : 'Ativa'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-600 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setShowDetailsModal(false); handlePlanAction(selectedUser, 'activate'); }}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Ativar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { setShowDetailsModal(false); handlePlanAction(selectedUser, 'renew'); }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Renovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => { setShowDetailsModal(false); handlePlanAction(selectedUser, 'suspend'); }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Suspender
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="transactions" className="mt-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {userDetails.transactions.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4">Nenhuma transação encontrada.</p>
                  ) : (
                    userDetails.transactions.slice(0, 20).map((t, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <span className="text-white text-sm">{String(t.description) || 'Transação'}</span>
                          <span className="text-xs text-slate-400 block">{String(t.date)}</span>
                        </div>
                        <span className={`font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir conta</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir a conta de {selectedUser?.full_name || 'este usuário'}? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

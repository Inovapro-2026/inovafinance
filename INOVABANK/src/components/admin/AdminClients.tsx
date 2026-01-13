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
  CheckCircle,
  RefreshCw,
  XCircle,
  Crown,
  Calendar,
  AlertTriangle,
  Clock
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planAction, setPlanAction] = useState<'activate' | 'renew' | 'block'>('activate');
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
    has_credit_card: false
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

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        (user.full_name?.toLowerCase().includes(query)) ||
        (user.email?.toLowerCase().includes(query)) ||
        (user.phone?.includes(query)) ||
        (user.matricula.toString().includes(query))
      );
    }

    // Apply status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(user => !user.blocked && user.subscription_status === 'active');
    } else if (filterStatus === 'blocked') {
      filtered = filtered.filter(user => user.blocked);
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(user => user.user_status === 'pending');
    } else if (filterStatus === 'expired') {
      filtered = filtered.filter(user => {
        if (!user.subscription_end_date) return false;
        return new Date(user.subscription_end_date) < new Date();
      });
    }

    // Apply sorting
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
      has_credit_card: false
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
      credit_limit: editForm.credit_limit ? parseFloat(editForm.credit_limit) : null
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

  // Plan Management Functions
  const openPlanModal = (user: AdminUser, action: 'activate' | 'renew' | 'block') => {
    setSelectedUser(user);
    setPlanAction(action);
    setRenewDays(30);
    setShowPlanModal(true);
  };

  const handleActivatePlan = async () => {
    if (!selectedUser) return;

    const now = new Date();
    const endDate = addDays(now, 30);

    const { error } = await supabase
      .from('users_matricula')
      .update({
        subscription_status: 'active',
        subscription_start_date: now.toISOString(),
        subscription_end_date: endDate.toISOString(),
        user_status: 'approved',
        blocked: false
      })
      .eq('id', selectedUser.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível ativar o plano.",
        variant: "destructive"
      });
    } else {
      await addAdminLog('activate_plan', selectedUser.id, { 
        start_date: now.toISOString(),
        end_date: endDate.toISOString()
      });
      toast({
        title: "Plano ativado!",
        description: `Plano de ${selectedUser.full_name || 'cliente'} ativado até ${format(endDate, 'dd/MM/yyyy')}.`
      });
      loadUsers();
      setShowPlanModal(false);
    }
  };

  const handleRenewPlan = async () => {
    if (!selectedUser) return;

    const currentEnd = selectedUser.subscription_end_date 
      ? new Date(selectedUser.subscription_end_date)
      : new Date();
    const newEndDate = addDays(currentEnd, renewDays);

    const { error } = await supabase
      .from('users_matricula')
      .update({
        subscription_status: 'active',
        subscription_end_date: newEndDate.toISOString(),
        user_status: 'approved',
        blocked: false
      })
      .eq('id', selectedUser.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível renovar o plano.",
        variant: "destructive"
      });
    } else {
      await addAdminLog('renew_plan', selectedUser.id, { 
        days_added: renewDays,
        new_end_date: newEndDate.toISOString()
      });
      toast({
        title: "Plano renovado!",
        description: `+${renewDays} dias adicionados. Novo vencimento: ${format(newEndDate, 'dd/MM/yyyy')}.`
      });
      loadUsers();
      setShowPlanModal(false);
    }
  };

  const handleSuspendPlan = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from('users_matricula')
      .update({
        subscription_status: 'suspended',
        blocked: true
      })
      .eq('id', selectedUser.id);

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível suspender o plano.",
        variant: "destructive"
      });
    } else {
      await addAdminLog('suspend_plan', selectedUser.id);
      toast({
        title: "Plano suspenso",
        description: `O plano de ${selectedUser.full_name || 'cliente'} foi suspenso.`
      });
      loadUsers();
      setShowPlanModal(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateUserBalance = (user: AdminUser, transactions: Array<Record<string, unknown>>) => {
    const initialBalance = user.initial_balance || 0;
    const transactionBalance = transactions.reduce((acc, t) => {
      const amount = Number(t.amount);
      return t.type === 'income' ? acc + amount : acc - amount;
    }, 0);
    return initialBalance + transactionBalance;
  };

  const exportToCSV = () => {
    const headers = ['Matrícula', 'Nome', 'Email', 'Telefone', 'Saldo', 'Status', 'Plano', 'Vencimento'];
    const rows = filteredUsers.map(user => [
      user.matricula,
      user.full_name || '',
      user.email || '',
      user.phone || '',
      user.initial_balance || 0,
      user.blocked ? 'Bloqueado' : 'Ativo',
      user.subscription_status || 'N/A',
      user.subscription_end_date ? format(new Date(user.subscription_end_date), 'dd/MM/yyyy') : 'N/A'
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

  const getSubscriptionBadge = (user: AdminUser) => {
    if (user.blocked || user.subscription_status === 'suspended') {
      return (
        <span className="px-2 py-1 text-xs font-bold bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Suspenso
        </span>
      );
    }
    
    if (user.user_status === 'pending') {
      return (
        <span className="px-2 py-1 text-xs font-bold bg-yellow-500/20 text-yellow-400 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" /> Pendente
        </span>
      );
    }
    
    if (user.subscription_end_date) {
      const endDate = new Date(user.subscription_end_date);
      const now = new Date();
      if (endDate < now) {
        return (
          <span className="px-2 py-1 text-xs font-bold bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Vencido
          </span>
        );
      } else if (user.subscription_status === 'active') {
        return (
          <span className="px-2 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Ativo
          </span>
        );
      }
    }
    
    return (
      <span className="px-2 py-1 text-xs font-bold bg-gray-500/20 text-gray-400 rounded-full">
        Sem plano
      </span>
    );
  };

  // Stats cards
  const statsCards = [
    { label: 'Total de Clientes', value: users.length, icon: Users, color: 'text-blue-500' },
    { label: 'Clientes Ativos', value: users.filter(u => !u.blocked && u.subscription_status === 'active').length, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Planos Pendentes', value: users.filter(u => u.user_status === 'pending').length, icon: Clock, color: 'text-yellow-500' },
    { label: 'Clientes Bloqueados', value: users.filter(u => u.blocked).length, icon: UserX, color: 'text-red-500' },
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
                  <p className="text-xs text-slate-400 font-semibold">{stat.label}</p>
                  <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail, telefone ou matrícula..."
            className="pl-10 bg-slate-800/50 border-slate-700 text-white font-semibold"
          />
        </div>

        {/* Filter */}
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <SelectTrigger className="w-44 bg-slate-800/50 border-slate-700 text-white font-semibold">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrar" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Planos Ativos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="expired">Vencidos</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white font-semibold">
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

        {/* Export */}
        <Button
          variant="outline"
          onClick={exportToCSV}
          className="bg-slate-800/50 border-slate-700 text-white hover:bg-slate-700 font-semibold"
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
              transition={{ delay: index * 0.03 }}
            >
              <Card className={`bg-slate-800/50 border-slate-700 ${user.blocked ? 'border-red-500/50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* User Info */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="text-white font-bold truncate block">{user.full_name || 'Sem nome'}</span>
                          <span className="text-xs text-slate-500 font-semibold">#{user.matricula}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300 text-sm font-semibold truncate">{user.email || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-slate-400" />
                        <span className="text-emerald-400 font-extrabold">
                          {formatCurrency(user.initial_balance || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300 text-sm font-semibold">
                          {user.subscription_end_date 
                            ? format(new Date(user.subscription_end_date), 'dd/MM/yyyy')
                            : '-'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {getSubscriptionBadge(user)}

                    {/* Plan Actions */}
                    <div className="flex items-center gap-1 border-l border-slate-700 pl-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openPlanModal(user, 'activate')}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        title="Ativar plano manualmente"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openPlanModal(user, 'renew')}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        title="Renovar plano"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openPlanModal(user, 'block')}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Suspender plano"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Standard Actions */}
                    <div className="flex items-center gap-1">
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
          <div className="text-center py-12 text-slate-400 font-semibold">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      {/* Plan Management Modal */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Crown className="w-5 h-5 text-yellow-400" />
              {planAction === 'activate' && 'Ativar Plano Manualmente'}
              {planAction === 'renew' && 'Renovar Plano'}
              {planAction === 'block' && 'Suspender Plano'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Cliente: <span className="text-white font-semibold">{selectedUser?.full_name || 'N/A'}</span>
              <br />
              Matrícula: <span className="text-white font-semibold">#{selectedUser?.matricula}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {planAction === 'activate' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-sm text-emerald-400 font-semibold">
                    ✅ O plano será ativado por 30 dias a partir de hoje.
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    Vencimento: {format(addDays(new Date(), 30), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <p className="text-sm text-slate-400">
                  Use esta opção como <span className="text-yellow-400 font-bold">Plano B</span> quando o pagamento PIX for confirmado mas o sistema não ativar automaticamente.
                </p>
              </div>
            )}

            {planAction === 'renew' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-400 font-semibold mb-2">
                    🔄 Escolha o período de extensão:
                  </p>
                  <div className="flex gap-2">
                    {[30, 60, 90].map((days) => (
                      <Button
                        key={days}
                        variant={renewDays === days ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRenewDays(days)}
                        className={renewDays === days 
                          ? "bg-blue-500 text-white font-bold" 
                          : "bg-slate-700 border-slate-600 text-white font-semibold"
                        }
                      >
                        +{days} dias
                      </Button>
                    ))}
                  </div>
                </div>
                {selectedUser?.subscription_end_date && (
                  <p className="text-sm text-slate-400">
                    Vencimento atual: <span className="text-white font-semibold">{format(new Date(selectedUser.subscription_end_date), 'dd/MM/yyyy')}</span>
                    <br />
                    Novo vencimento: <span className="text-emerald-400 font-bold">
                      {format(addDays(new Date(selectedUser.subscription_end_date), renewDays), 'dd/MM/yyyy')}
                    </span>
                  </p>
                )}
              </div>
            )}

            {planAction === 'block' && (
              <div className="space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400 font-semibold">
                    ⛔ O plano será suspenso imediatamente.
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    O cliente perderá acesso às funcionalidades, mas ainda poderá acessar o suporte.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowPlanModal(false)} className="font-semibold">
              Cancelar
            </Button>
            {planAction === 'activate' && (
              <Button onClick={handleActivatePlan} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                <CheckCircle className="w-4 h-4 mr-2" />
                Ativar Plano
              </Button>
            )}
            {planAction === 'renew' && (
              <Button onClick={handleRenewPlan} className="bg-blue-500 hover:bg-blue-600 text-white font-bold">
                <RefreshCw className="w-4 h-4 mr-2" />
                Renovar +{renewDays} dias
              </Button>
            )}
            {planAction === 'block' && (
              <Button onClick={handleSuspendPlan} className="bg-red-500 hover:bg-red-600 text-white font-bold">
                <XCircle className="w-4 h-4 mr-2" />
                Suspender Plano
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold">Editar Cliente</DialogTitle>
            <DialogDescription className="text-slate-400">
              Altere os dados do cliente abaixo.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="bg-slate-700 w-full">
              <TabsTrigger value="personal" className="flex-1 font-semibold">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="financial" className="flex-1 font-semibold">Financeiro</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-slate-300 font-semibold">Nome completo</label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="bg-slate-700 border-slate-600 font-semibold"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 font-semibold">E-mail</label>
                <Input
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="bg-slate-700 border-slate-600 font-semibold"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 font-semibold">Telefone</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="bg-slate-700 border-slate-600 font-semibold"
                />
              </div>
            </TabsContent>
            <TabsContent value="financial" className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-slate-300 font-semibold">Saldo Inicial (R$)</label>
                <Input
                  type="number"
                  value={editForm.initial_balance}
                  onChange={(e) => setEditForm({ ...editForm, initial_balance: e.target.value })}
                  className="bg-slate-700 border-slate-600 font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300 font-semibold">Salário (R$)</label>
                  <Input
                    type="number"
                    value={editForm.salary_amount}
                    onChange={(e) => setEditForm({ ...editForm, salary_amount: e.target.value })}
                    className="bg-slate-700 border-slate-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 font-semibold">Dia do salário</label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.salary_day}
                    onChange={(e) => setEditForm({ ...editForm, salary_day: e.target.value })}
                    className="bg-slate-700 border-slate-600 font-semibold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300 font-semibold">Adiantamento (R$)</label>
                  <Input
                    type="number"
                    value={editForm.advance_amount}
                    onChange={(e) => setEditForm({ ...editForm, advance_amount: e.target.value })}
                    className="bg-slate-700 border-slate-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 font-semibold">Dia do adiantamento</label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.advance_day}
                    onChange={(e) => setEditForm({ ...editForm, advance_day: e.target.value })}
                    className="bg-slate-700 border-slate-600 font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-300 font-semibold">Limite de Crédito (R$)</label>
                <Input
                  type="number"
                  value={editForm.credit_limit}
                  onChange={(e) => setEditForm({ ...editForm, credit_limit: e.target.value })}
                  className="bg-slate-700 border-slate-600 font-semibold"
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEditModal(false)} className="font-semibold">
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} className="font-bold">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <User className="w-5 h-5" />
              {selectedUser?.full_name || 'Cliente'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedUser && userDetails && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="bg-slate-700 w-full">
                <TabsTrigger value="info" className="flex-1 font-semibold">Informações</TabsTrigger>
                <TabsTrigger value="plan" className="flex-1 font-semibold">Plano</TabsTrigger>
                <TabsTrigger value="transactions" className="flex-1 font-semibold">Transações</TabsTrigger>
                <TabsTrigger value="payments" className="flex-1 font-semibold">Pagamentos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="info" className="mt-4">
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">Matrícula</p>
                      <p className="text-white font-bold">{selectedUser.matricula}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">E-mail</p>
                      <p className="text-white font-semibold">{selectedUser.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">Telefone</p>
                      <p className="text-white font-semibold">{selectedUser.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">Saldo Atual</p>
                      <p className="text-emerald-400 font-extrabold">
                        {formatCurrency(calculateUserBalance(selectedUser, userDetails.transactions))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">Salário</p>
                      <p className="text-white font-semibold">
                        {selectedUser.salary_amount 
                          ? `${formatCurrency(selectedUser.salary_amount)} (dia ${selectedUser.salary_day})`
                          : '-'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">Adiantamento</p>
                      <p className="text-white font-semibold">
                        {selectedUser.advance_amount 
                          ? `${formatCurrency(selectedUser.advance_amount)} (dia ${selectedUser.advance_day})`
                          : '-'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">Limite de Crédito</p>
                      <p className="text-white font-semibold">{selectedUser.credit_limit ? formatCurrency(selectedUser.credit_limit) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold">Crédito Usado</p>
                      <p className="text-orange-400 font-extrabold">{selectedUser.credit_used ? formatCurrency(selectedUser.credit_used) : 'R$ 0,00'}</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="plan" className="mt-4">
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold">Status do Plano</span>
                      {getSubscriptionBadge(selectedUser)}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-400 font-semibold">Início</p>
                        <p className="text-white font-bold">
                          {selectedUser.subscription_start_date 
                            ? format(new Date(selectedUser.subscription_start_date), 'dd/MM/yyyy')
                            : '-'
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-semibold">Vencimento</p>
                        <p className="text-white font-bold">
                          {selectedUser.subscription_end_date 
                            ? format(new Date(selectedUser.subscription_end_date), 'dd/MM/yyyy')
                            : '-'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-slate-600">
                      <Button
                        size="sm"
                        onClick={() => { setShowDetailsModal(false); openPlanModal(selectedUser, 'activate'); }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Ativar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { setShowDetailsModal(false); openPlanModal(selectedUser, 'renew'); }}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Renovar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { setShowDetailsModal(false); openPlanModal(selectedUser, 'block'); }}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Suspender
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="transactions" className="mt-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {userDetails.transactions.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-4 font-semibold">Nenhuma transação encontrada.</p>
                  ) : (
                    userDetails.transactions.slice(0, 20).map((t, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <span className="text-white text-sm font-semibold">{String(t.description) || 'Transação'}</span>
                          <span className="text-xs text-slate-400 block">{String(t.date)}</span>
                        </div>
                        <span className={`font-extrabold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="payments" className="mt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm text-slate-400 mb-2 font-semibold">Pagamentos Agendados</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {userDetails.scheduledPayments.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-2 font-semibold">Nenhum pagamento agendado.</p>
                      ) : (
                        userDetails.scheduledPayments.map((p, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                            <div>
                              <span className="text-white text-sm font-semibold">{String(p.name)}</span>
                              <span className="text-xs text-slate-400 block">Dia {String(p.due_day)}</span>
                            </div>
                            <span className="text-orange-400 font-extrabold">
                              {formatCurrency(Number(p.amount))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm text-slate-400 mb-2 font-semibold">Histórico de Pagamentos</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {userDetails.paymentLogs.length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-2 font-semibold">Nenhum pagamento realizado.</p>
                      ) : (
                        userDetails.paymentLogs.slice(0, 10).map((p, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                            <div>
                              <span className="text-white text-sm font-semibold">{String(p.name)}</span>
                              <span className="text-xs text-slate-400 block">
                                {new Date(String(p.paid_at)).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <span className="text-emerald-400 font-extrabold">
                              {formatCurrency(Number(p.amount))}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white font-bold">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Tem certeza que deseja excluir a conta de <span className="text-white font-bold">{selectedUser?.full_name || 'cliente'}</span>?
              Esta ação excluirá permanentemente todos os dados do cliente, incluindo transações, pagamentos e histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 font-semibold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white font-bold"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

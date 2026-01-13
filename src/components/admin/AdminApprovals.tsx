import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { addAdminLog } from "@/lib/adminDb";
import {
  UserCheck,
  UserX,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Mail,
  Calendar,
  Link2,
  FileText,
  ExternalLink,
  ImageIcon
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PendingUser {
  id: string;
  matricula: number;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  user_status: string;
  payment_proof_url: string | null;
  inviter_matricula?: number;
  inviter_name?: string;
}

export function AdminApprovals() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [selectedProof, setSelectedProof] = useState<{ url: string; userName: string } | null>(null);
  const { toast } = useToast();

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    loadPendingUsers();
    loadStats();
  }, []);

  const loadStats = async () => {
    const { data: allUsers } = await supabase
      .from('users_matricula')
      .select('user_status');

    if (allUsers) {
      setStats({
        pending: allUsers.filter(u => u.user_status === 'pending').length,
        approved: allUsers.filter(u => u.user_status === 'approved').length,
        rejected: allUsers.filter(u => u.user_status === 'rejected').length
      });
    }
  };

  const loadPendingUsers = async () => {
    setIsLoading(true);

    // Get pending users with affiliate info
    const { data: users, error } = await supabase
      .from('users_matricula')
      .select('*')
      .eq('user_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading pending users:', error);
      setIsLoading(false);
      return;
    }

    // Get affiliate invites to check who invited each user
    const pendingWithInvites: PendingUser[] = [];

    for (const user of users || []) {
      const { data: invite } = await supabase
        .from('affiliate_invites')
        .select('inviter_matricula')
        .eq('invited_matricula', user.matricula)
        .maybeSingle();

      let inviterName = null;
      if (invite?.inviter_matricula) {
        const { data: inviter } = await supabase
          .from('users_matricula')
          .select('full_name')
          .eq('matricula', invite.inviter_matricula)
          .maybeSingle();
        inviterName = inviter?.full_name;
      }

      pendingWithInvites.push({
        ...user,
        inviter_matricula: invite?.inviter_matricula,
        inviter_name: inviterName
      });
    }

    setPendingUsers(pendingWithInvites);
    setIsLoading(false);
  };

  const handleApprove = async (user: PendingUser) => {
    setProcessingId(user.id);

    try {
      // Update user status to approved
      const { error: updateError } = await supabase
        .from('users_matricula')
        .update({ user_status: 'approved' })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // If user was invited by affiliate, release the commission
      if (user.inviter_matricula) {
        // Update affiliate invite status
        await supabase
          .from('affiliate_invites')
          .update({
            status: 'approved',
            reviewed_at: new Date().toISOString()
          })
          .eq('invited_matricula', user.matricula);

        // Release the commission
        await supabase
          .from('affiliate_commissions')
          .update({
            status: 'released',
            released_at: new Date().toISOString()
          })
          .eq('invited_matricula', user.matricula);
      }

      // Log the action
      await addAdminLog('approve_user', user.id, {
        matricula: user.matricula,
        full_name: user.full_name,
        inviter_matricula: user.inviter_matricula
      });

      toast({
        title: "Usuário aprovado!",
        description: `${user.full_name || 'Usuário'} agora pode acessar o INOVAFINANCE.`
      });

      loadPendingUsers();
      loadStats();
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o usuário.",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (user: PendingUser) => {
    setProcessingId(user.id);

    try {
      // Update user status to rejected
      const { error: updateError } = await supabase
        .from('users_matricula')
        .update({ user_status: 'rejected' })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // If user was invited by affiliate, reject the invite (no commission)
      if (user.inviter_matricula) {
        await supabase
          .from('affiliate_invites')
          .update({
            status: 'rejected',
            reviewed_at: new Date().toISOString()
          })
          .eq('invited_matricula', user.matricula);

        // Remove any pending commission
        await supabase
          .from('affiliate_commissions')
          .delete()
          .eq('invited_matricula', user.matricula)
          .eq('status', 'locked');
      }

      // Log the action
      await addAdminLog('reject_user', user.id, {
        matricula: user.matricula,
        full_name: user.full_name,
        inviter_matricula: user.inviter_matricula
      });

      toast({
        title: "Usuário rejeitado",
        description: `O cadastro de ${user.full_name || 'usuário'} foi rejeitado.`,
        variant: "destructive"
      });

      loadPendingUsers();
      loadStats();
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar o usuário.",
        variant: "destructive"
      });
    } finally {
      setProcessingId(null);
    }
  };

  const statsCards = [
    { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'Aprovados', value: stats.approved, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { label: 'Rejeitados', value: stats.rejected, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          Cadastros Pendentes
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { loadPendingUsers(); loadStats(); }}
          className="bg-slate-800/50 border-slate-700 text-white"
        >
          Atualizar
        </Button>
      </div>

      {/* Pending Users List */}
      {pendingUsers.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-slate-300">Nenhum cadastro pendente de aprovação!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {pendingUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-slate-800/50 border-slate-700 border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* User Info */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="text-white block font-medium">{user.full_name || 'Sem nome'}</span>
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
                            {format(new Date(user.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {user.inviter_matricula && (
                          <div className="flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-secondary" />
                            <span className="text-secondary text-sm">
                              Indicado por: {user.inviter_name || `#${user.inviter_matricula}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Payment Proof Button */}
                      <div className="flex items-center">
                        {user.payment_proof_url ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedProof({
                                url: user.payment_proof_url!,
                                userName: user.full_name || `#${user.matricula}`
                              });
                              setProofDialogOpen(true);
                            }}
                            className="bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-600/30"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Ver Comprovante
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            Sem comprovante
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(user)}
                          disabled={processingId === user.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {processingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-1" />
                              Aprovar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(user)}
                          disabled={processingId === user.id}
                        >
                          {processingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserX className="w-4 h-4 mr-1" />
                              Rejeitar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Payment Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Comprovante de Pagamento - {selectedProof?.userName}
            </DialogTitle>
          </DialogHeader>

          {selectedProof && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="bg-slate-800 rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                {selectedProof.url.toLowerCase().endsWith('.pdf') ? (
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <p className="text-slate-300 mb-2">Arquivo PDF</p>
                    <Button
                      onClick={() => window.open(selectedProof.url, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir PDF
                    </Button>
                  </div>
                ) : (
                  <img
                    src={selectedProof.url}
                    alt="Comprovante de pagamento"
                    className="max-w-full max-h-[400px] object-contain rounded-lg"
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedProof.url, '_blank')}
                  className="bg-slate-800 border-slate-700 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir em nova aba
                </Button>
                <Button
                  onClick={() => setProofDialogOpen(false)}
                  className="bg-primary hover:bg-primary/90"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  FileText, 
  Calendar,
  CreditCard,
  Crown,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  QrCode,
  RefreshCw,
  Loader2,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionInfo {
  status: 'active' | 'pending' | 'expired';
  startDate: Date | null;
  endDate: Date | null;
  daysRemaining: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  
  // Editable fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setBirthDate(user.birthDate || '');
      loadSubscriptionInfo();
    }
  }, [user]);

  const loadSubscriptionInfo = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('users_matricula')
      .select('subscription_start_date, subscription_end_date, subscription_status, user_status, blocked')
      .eq('matricula', user.userId)
      .single();

    if (data) {
      const endDate = data.subscription_end_date ? new Date(data.subscription_end_date) : null;
      const now = new Date();
      
      let status: 'active' | 'pending' | 'expired' | 'suspended' = 'active';
      let daysRemaining = 0;
      
      if (data.blocked || data.subscription_status === 'suspended') {
        status = 'suspended' as any;
      } else if (data.user_status === 'pending') {
        status = 'pending';
      } else if (endDate && endDate < now) {
        status = 'expired';
      } else if (endDate) {
        daysRemaining = differenceInDays(endDate, now);
        status = 'active';
      }

      setSubscriptionInfo({
        status: status as any,
        startDate: data.subscription_start_date ? new Date(data.subscription_start_date) : null,
        endDate,
        daysRemaining
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('users_matricula')
        .update({
          full_name: fullName,
          email: email,
          birth_date: birthDate || null
        })
        .eq('matricula', user.userId);

      if (error) throw error;

      await refreshUser();
      setIsEditing(false);
      toast({
        title: "Dados atualizados!",
        description: "Suas informações foram salvas com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar seus dados.",
        variant: "destructive"
      });
    }

    setIsLoading(false);
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '-';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Ativa
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs font-extrabold text-yellow-600 bg-yellow-100 px-3 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      case 'expired':
        return (
          <span className="flex items-center gap-1 text-xs font-extrabold text-red-600 bg-red-100 px-3 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Expirada
          </span>
        );
      case 'suspended':
        return (
          <span className="flex items-center gap-1 text-xs font-extrabold text-red-600 bg-red-100 px-3 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Suspenso
          </span>
        );
      default:
        return null;
    }
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen pb-28 px-4 pt-6 bg-muted/30"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-6">
        <h1 className="font-display text-2xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground text-sm">Gerencie suas informações</p>
      </motion.div>

      {/* Personal Data */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-semibold">Dados Pessoais</h2>
            </div>
            {!isEditing ? (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-primary"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setFullName(user.fullName || '');
                    setEmail(user.email || '');
                    setBirthDate(user.birthDate || '');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-primary text-primary-foreground"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                Nome Completo
              </Label>
              {isEditing ? (
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium mt-1">{user.fullName || '-'}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" />
                E-mail
              </Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium mt-1">{user.email || '-'}</p>
              )}
            </div>

            {/* CPF */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="w-3 h-3" />
                CPF
              </Label>
              <p className="font-medium mt-1">{formatCPF(user.cpf || '')}</p>
            </div>

            {/* Birth Date */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Data de Nascimento
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium mt-1">
                  {user.birthDate ? format(new Date(user.birthDate), 'dd/MM/yyyy') : '-'}
                </p>
              )}
            </div>

            {/* Matrícula */}
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                Matrícula
              </Label>
              <p className="font-medium mt-1 text-primary">{user.userId}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Subscription Summary */}
      <motion.div variants={itemVariants}>
        <GlassCard className="p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Assinatura</h2>
                {subscriptionInfo && getStatusBadge(subscriptionInfo.status)}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm font-semibold text-muted-foreground">Plano</span>
              <span className="font-bold text-foreground">INOVAFINANCE Premium</span>
            </div>
            
            {subscriptionInfo?.startDate && (
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-sm font-semibold text-muted-foreground">Início</span>
                <span className="font-bold text-foreground">
                  {format(subscriptionInfo.startDate, 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            )}
            
            {subscriptionInfo?.endDate && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm font-semibold text-muted-foreground">Vencimento</span>
                  <span className="font-bold text-foreground">
                    {format(subscriptionInfo.endDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm font-semibold text-muted-foreground">Dias restantes</span>
                  <span className={`font-extrabold ${subscriptionInfo.daysRemaining < 7 ? 'text-destructive' : 'text-success'}`}>
                    {subscriptionInfo.daysRemaining} dias
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/subscription')}
            >
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Ver detalhes da assinatura
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            {subscriptionInfo?.status !== 'active' && (
              <Button
                className="w-full justify-between bg-primary text-primary-foreground"
                onClick={() => navigate('/subscription')}
              >
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Renovar agora
                </span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/subscription?action=pix')}
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
    </motion.div>
  );
}

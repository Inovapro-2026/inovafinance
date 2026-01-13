import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle,
  Search,
  Filter,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ChevronLeft,
  Loader2,
  User,
  Shield,
  RefreshCw,
  Crown,
  Calendar,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Ticket {
  id: string;
  ticket_number: number;
  user_matricula: number;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  last_message_at: string;
  last_message_by: string;
  user_name?: string;
  user_email?: string;
}

interface Message {
  id: string;
  sender_type: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

interface UserSubscription {
  full_name: string;
  matricula: number;
  email: string;
  subscription_status: string;
  subscription_end_date: string | null;
  user_status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  'aberto': { label: 'Aberto', color: 'bg-blue-500', variant: 'default' },
  'em_atendimento': { label: 'Em atendimento', color: 'bg-yellow-500', variant: 'secondary' },
  'respondido': { label: 'Respondido', color: 'bg-green-500', variant: 'default' },
  'encerrado': { label: 'Encerrado', color: 'bg-gray-500', variant: 'outline' },
};

const CATEGORIES = [
  { value: 'all', label: 'Todas categorias' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'afiliados', label: 'Afiliados' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'outro', label: 'Outro' },
];

export function AdminSupport() {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Chat
  const [chatMessage, setChatMessage] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id);
      loadUserSubscription(selectedTicket.user_matricula);
      
      const interval = setInterval(() => {
        loadMessages(selectedTicket.id);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTickets = async () => {
    setIsLoading(true);

    const { data: ticketsData, error } = await supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (ticketsData) {
      // Load user names
      const matriculas = [...new Set(ticketsData.map(t => t.user_matricula))];
      const { data: users } = await supabase
        .from('users_matricula')
        .select('matricula, full_name, email')
        .in('matricula', matriculas);

      const userMap = new Map(users?.map(u => [u.matricula, { name: u.full_name, email: u.email }]) || []);

      const enrichedTickets = ticketsData.map(t => ({
        ...t,
        user_name: userMap.get(t.user_matricula)?.name || 'Usuário',
        user_email: userMap.get(t.user_matricula)?.email || ''
      }));

      setTickets(enrichedTickets);
    }

    setIsLoading(false);
  };

  const loadMessages = async (ticketId: string) => {
    const { data } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
    }
  };

  const loadUserSubscription = async (matricula: number) => {
    const { data } = await supabase
      .from('users_matricula')
      .select('full_name, matricula, email, subscription_status, subscription_end_date, user_status')
      .eq('matricula', matricula)
      .single();

    if (data) {
      setUserSubscription(data);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || !chatMessage.trim()) return;

    setIsSending(true);

    try {
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_type: 'admin',
          message: chatMessage.trim()
        });

      if (messageError) throw messageError;

      await supabase
        .from('support_tickets')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_by: 'admin',
          status: 'respondido'
        })
        .eq('id', selectedTicket.id);

      setChatMessage('');
      loadMessages(selectedTicket.id);
      loadTickets();

      toast({
        title: "Mensagem enviada!",
        description: "O usuário foi notificado."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive"
      });
    }

    setIsSending(false);
  };

  const handleChangeStatus = async (status: string) => {
    if (!selectedTicket) return;

    try {
      await supabase
        .from('support_tickets')
        .update({ status })
        .eq('id', selectedTicket.id);

      setSelectedTicket({ ...selectedTicket, status });
      loadTickets();

      toast({
        title: "Status atualizado!",
        description: `Ticket alterado para "${STATUS_CONFIG[status]?.label}".`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status.",
        variant: "destructive"
      });
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toString().includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStats = () => {
    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'aberto').length;
    const inProgress = tickets.filter(t => t.status === 'em_atendimento').length;
    const answered = tickets.filter(t => t.status === 'respondido').length;
    return { total, open, inProgress, answered };
  };

  const stats = getStats();

  if (selectedTicket) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedTicket(null)}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Ticket #{selectedTicket.ticket_number}</h2>
              <Badge variant={STATUS_CONFIG[selectedTicket.status]?.variant}>
                {STATUS_CONFIG[selectedTicket.status]?.label}
              </Badge>
            </div>
            <p className="text-sm text-slate-400">{selectedTicket.subject}</p>
          </div>
          
          {/* Status Actions */}
          <Select value={selectedTicket.status} onValueChange={handleChangeStatus}>
            <SelectTrigger className="w-[180px] bg-slate-700/50 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_atendimento">Em atendimento</SelectItem>
              <SelectItem value="respondido">Respondido</SelectItem>
              <SelectItem value="encerrado">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700 h-[600px] flex flex-col">
              <CardContent className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%]`}>
                        <div className={`flex items-center gap-2 mb-1 ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            msg.sender_type === 'admin' ? 'bg-primary/20' : 'bg-slate-600'
                          }`}>
                            {msg.sender_type === 'admin' ? (
                              <Shield className="w-3 h-3 text-primary" />
                            ) : (
                              <User className="w-3 h-3 text-slate-300" />
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {msg.sender_type === 'admin' ? 'Você' : selectedTicket.user_name}
                          </span>
                        </div>
                        <div className={`rounded-2xl px-4 py-2 ${
                          msg.sender_type === 'admin' 
                            ? 'bg-primary text-white rounded-br-md' 
                            : 'bg-slate-700 text-slate-200 rounded-bl-md'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        </div>
                        <p className={`text-xs text-slate-500 mt-1 ${msg.sender_type === 'admin' ? 'text-right' : 'text-left'}`}>
                          {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
              
              {/* Message Input */}
              <div className="p-4 border-t border-slate-700">
                <div className="flex gap-2">
                  <Textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Digite sua resposta..."
                    className="flex-1 bg-slate-700/50 border-slate-600 text-white resize-none"
                    rows={2}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isSending || !chatMessage.trim()}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* User Info Sidebar */}
          <div className="space-y-4">
            {/* User Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Informações do Usuário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500">Nome</p>
                  <p className="text-white font-medium">{selectedTicket.user_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Matrícula</p>
                  <p className="text-white font-medium">{selectedTicket.user_matricula}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">E-mail</p>
                  <p className="text-white font-medium text-sm">{selectedTicket.user_email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Categoria</p>
                  <p className="text-white font-medium capitalize">{selectedTicket.category}</p>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Card (if category is assinatura) */}
            {selectedTicket.category === 'assinatura' && userSubscription && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Assinatura
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    <Badge variant={userSubscription.user_status === 'approved' ? 'default' : 'secondary'}>
                      {userSubscription.user_status === 'approved' ? 'Ativa' : 'Pendente'}
                    </Badge>
                  </div>
                  {userSubscription.subscription_end_date && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">Vencimento</p>
                        <p className="text-white font-medium">
                          {format(new Date(userSubscription.subscription_end_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Dias restantes</p>
                        <p className="text-white font-medium">
                          {Math.max(0, differenceInDays(new Date(userSubscription.subscription_end_date), new Date()))} dias
                        </p>
                      </div>
                    </>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => setShowSubscriptionModal(true)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Gerenciar Assinatura
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.open}</p>
                <p className="text-xs text-slate-400">Abertos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
                <p className="text-xs text-slate-400">Em atendimento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.answered}</p>
                <p className="text-xs text-slate-400">Respondidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por ticket, usuário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-700/50 border-slate-600 text-white"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-slate-700/50 border-slate-600 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_atendimento">Em atendimento</SelectItem>
            <SelectItem value="respondido">Respondido</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-slate-700/50 border-slate-600 text-white">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={loadTickets} className="border-slate-600 text-slate-300">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Tickets List */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredTickets.length > 0 ? (
            <div className="divide-y divide-slate-700">
              {filteredTickets.map((ticket) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-slate-400">#{ticket.ticket_number}</span>
                        <Badge variant={STATUS_CONFIG[ticket.status]?.variant}>
                          {STATUS_CONFIG[ticket.status]?.label}
                        </Badge>
                        <Badge variant="outline" className="text-slate-400 border-slate-600">
                          {ticket.category}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-white mb-1">{ticket.subject}</h3>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ticket.user_name}
                        </span>
                        <span>Mat: {ticket.user_matricula}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        {format(new Date(ticket.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </p>
                      {ticket.last_message_by === 'user' && ticket.status !== 'encerrado' && (
                        <span className="text-xs text-yellow-400 font-medium">
                          Aguardando resposta
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhum ticket encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

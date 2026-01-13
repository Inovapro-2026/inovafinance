import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Send,
  Loader2,
  User,
  Calendar,
  CreditCard,
  RefreshCw,
  X
} from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  last_message_at: string | null;
  last_message_by: string | null;
  user_matricula: number;
  user?: {
    full_name: string | null;
    email: string | null;
    subscription_status: string | null;
    subscription_end_date: string | null;
  };
}

interface Message {
  id: string;
  message: string;
  sender_type: string;
  sender_matricula: number | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Aberto', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  in_progress: { label: 'Em Atendimento', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  answered: { label: 'Respondido', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  closed: { label: 'Encerrado', color: 'text-slate-400', bg: 'bg-slate-400/10' },
};

const categoryLabels: Record<string, string> = {
  financial: 'Financeiro',
  subscription: 'Assinatura',
  affiliate: 'Afiliados',
  technical: 'Técnico',
  other: 'Outro',
};

export function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  
  // Chat modal
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [searchQuery, filterStatus, filterCategory, tickets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Load user data separately
      const ticketsWithUsers = await Promise.all((data || []).map(async (ticket) => {
        const { data: userData } = await supabase
          .from('users_matricula')
          .select('full_name, email, subscription_status, subscription_end_date')
          .eq('matricula', ticket.user_matricula)
          .single();
        return { ...ticket, user: userData || undefined };
      }));
      
      setTickets(ticketsWithUsers as Ticket[]);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os tickets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.subject.toLowerCase().includes(query) ||
        t.ticket_number.toString().includes(query) ||
        t.user?.full_name?.toLowerCase().includes(query) ||
        t.user_matricula.toString().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    setFilteredTickets(filtered);
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
    setShowChatModal(true);

    // If ticket is open, set to in_progress
    if (ticket.status === 'open') {
      await updateTicketStatus(ticket.id, 'in_progress');
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return;

    setIsSending(true);
    try {
      // Get current user (admin)
      const { data: { user: authUser } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          message: newMessage.trim(),
          sender_type: 'admin',
          sender_matricula: null,
        });

      if (error) throw error;

      // Update ticket
      await supabase
        .from('support_tickets')
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message_by: 'admin',
          status: 'answered'
        })
        .eq('id', selectedTicket.id);

      setNewMessage('');
      await loadMessages(selectedTicket.id);
      await loadTickets();

      toast({ title: "Mensagem enviada!" });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const updates: Record<string, unknown> = { status };
      if (status === 'closed') {
        updates.closed_at = new Date().toISOString();
      }

      await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      await loadTickets();
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status });
      }

      toast({ title: `Status alterado para ${statusConfig[status]?.label || status}` });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Stats
  const stats = [
    { label: 'Total', value: tickets.length, color: 'text-blue-400' },
    { label: 'Abertos', value: tickets.filter(t => t.status === 'open').length, color: 'text-blue-400' },
    { label: 'Em Atendimento', value: tickets.filter(t => t.status === 'in_progress').length, color: 'text-amber-400' },
    { label: 'Respondidos', value: tickets.filter(t => t.status === 'answered').length, color: 'text-emerald-400' },
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
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <p className="text-xs text-slate-400">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por assunto, número ou usuário..."
            className="pl-10 bg-slate-800/50 border-slate-700 text-white"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="in_progress">Em Atendimento</SelectItem>
            <SelectItem value="answered">Respondidos</SelectItem>
            <SelectItem value="closed">Encerrados</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="financial">Financeiro</SelectItem>
            <SelectItem value="subscription">Assinatura</SelectItem>
            <SelectItem value="affiliate">Afiliados</SelectItem>
            <SelectItem value="technical">Técnico</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredTickets.map((ticket, index) => {
            const config = statusConfig[ticket.status] || statusConfig.open;
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card 
                  className="bg-slate-800/50 border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors"
                  onClick={() => openTicket(ticket)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-slate-400">#{ticket.ticket_number}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} font-medium`}>
                            {config.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                            {categoryLabels[ticket.category] || ticket.category}
                          </span>
                        </div>
                        <h3 className="font-semibold text-white">{ticket.subject}</h3>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {ticket.user?.full_name || `#${ticket.user_matricula}`}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(ticket.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      {ticket.last_message_by === 'user' && ticket.status !== 'closed' && (
                        <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium">
                          Aguardando resposta
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredTickets.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            Nenhum ticket encontrado.
          </div>
        )}
      </div>

      {/* Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Ticket #{selectedTicket?.ticket_number} - {selectedTicket?.subject}</span>
              <Select 
                value={selectedTicket?.status || 'open'} 
                onValueChange={(v) => selectedTicket && updateTicketStatus(selectedTicket.id, v)}
              >
                <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Atendimento</SelectItem>
                  <SelectItem value="answered">Respondido</SelectItem>
                  <SelectItem value="closed">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </DialogTitle>
          </DialogHeader>

          {/* User Info (for subscription tickets) */}
          {selectedTicket?.category === 'subscription' && selectedTicket?.user && (
            <div className="p-3 bg-slate-700/50 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{selectedTicket.user.full_name}</p>
                <p className="text-xs text-slate-400">Matrícula: {selectedTicket.user_matricula}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Status da Assinatura</p>
                <p className={`text-sm font-medium ${
                  selectedTicket.user.subscription_status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {selectedTicket.user.subscription_status === 'active' ? 'Ativo' : 'Pendente'}
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-900/50 rounded-lg min-h-[300px] max-h-[400px]">
            <div className="space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.sender_type === 'admin' 
                        ? 'bg-primary text-primary-foreground rounded-br-md' 
                        : 'bg-slate-700 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${msg.sender_type === 'admin' ? 'text-primary-foreground/70' : 'text-slate-400'}`}>
                      {msg.sender_type === 'user' ? `Usuário #${msg.sender_matricula} • ` : 'Admin • '}
                      {formatDate(msg.created_at)}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          {selectedTicket?.status !== 'closed' && (
            <div className="flex gap-2 pt-4">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua resposta..."
                className="flex-1 bg-slate-700 border-slate-600 resize-none"
                rows={2}
              />
              <Button 
                onClick={sendMessage} 
                disabled={isSending || !newMessage.trim()}
                className="self-end"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

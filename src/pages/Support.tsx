import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Paperclip,
  Loader2,
  User,
  MessageSquare,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  last_message_at: string | null;
  last_message_by: string | null;
}

interface Message {
  id: string;
  message: string;
  sender_type: string;
  sender_matricula: number | null;
  created_at: string;
  attachment_url: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  open: { label: 'Aberto', color: 'text-blue-500', bg: 'bg-blue-500/10', icon: MessageCircle },
  in_progress: { label: 'Em Atendimento', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: Clock },
  answered: { label: 'Respondido', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  closed: { label: 'Encerrado', color: 'text-slate-400', bg: 'bg-slate-400/10', icon: AlertCircle },
};

const categories = [
  { value: 'financial', label: 'Financeiro' },
  { value: 'subscription', label: 'Assinatura' },
  { value: 'affiliate', label: 'Afiliados' },
  { value: 'technical', label: 'Técnico' },
  { value: 'other', label: 'Outro' },
];

export default function Support() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New ticket form
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newInitialMessage, setNewInitialMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (user?.userId) {
      loadTickets();
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadTickets = async () => {
    if (!user?.userId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_matricula', user.userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Erro ao carregar tickets');
    } finally {
      setIsLoading(false);
    }
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
      toast.error('Erro ao carregar mensagens');
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);
    setView('chat');
  };

  const createTicket = async () => {
    if (!user?.userId || !newSubject.trim() || !newCategory || !newInitialMessage.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsCreating(true);
    try {
      // Create ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_matricula: user.userId,
          subject: newSubject.trim(),
          category: newCategory,
          status: 'open',
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Add initial message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticketData.id,
          message: newInitialMessage.trim(),
          sender_type: 'user',
          sender_matricula: user.userId,
        });

      if (messageError) throw messageError;

      toast.success(`Ticket #${ticketData.ticket_number} criado com sucesso!`);
      setNewSubject('');
      setNewCategory('');
      setNewInitialMessage('');
      await loadTickets();
      setView('list');
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Erro ao criar ticket');
    } finally {
      setIsCreating(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedTicket || !newMessage.trim() || !user?.userId) return;

    // Don't allow sending if ticket is closed
    if (selectedTicket.status === 'closed') {
      toast.error('Este ticket está encerrado');
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          message: newMessage.trim(),
          sender_type: 'user',
          sender_matricula: user.userId,
        });

      if (error) throw error;

      // Update ticket last message info
      await supabase
        .from('support_tickets')
        .update({ 
          last_message_at: new Date().toISOString(),
          last_message_by: 'user',
          status: selectedTicket.status === 'answered' ? 'open' : selectedTicket.status
        })
        .eq('id', selectedTicket.id);

      setNewMessage('');
      await loadMessages(selectedTicket.id);
      await loadTickets();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {view !== 'list' && (
          <button 
            onClick={() => { setView('list'); setSelectedTicket(null); }}
            className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold">
            {view === 'list' ? 'Suporte' : view === 'new' ? 'Novo Ticket' : `Ticket #${selectedTicket?.ticket_number}`}
          </h1>
          <p className="text-muted-foreground text-sm">
            {view === 'list' ? 'Central de atendimento' : view === 'new' ? 'Descreva seu problema' : selectedTicket?.subject}
          </p>
        </div>
        {view === 'list' && (
          <Button onClick={() => setView('new')} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Ticket List */}
        {view === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {tickets.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Nenhum ticket ainda</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Precisa de ajuda? Abra um novo ticket de suporte.
                </p>
                <Button onClick={() => setView('new')} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Abrir Ticket
                </Button>
              </GlassCard>
            ) : (
              tickets.map((ticket, index) => {
                const config = statusConfig[ticket.status] || statusConfig.open;
                const StatusIcon = config.icon;
                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <GlassCard 
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => openTicket(ticket)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
                          <StatusIcon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">#{ticket.ticket_number}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} font-medium`}>
                              {config.label}
                            </span>
                          </div>
                          <h3 className="font-semibold truncate">{ticket.subject}</h3>
                          <p className="text-xs text-muted-foreground">
                            {categories.find(c => c.value === ticket.category)?.label || ticket.category} • {formatDate(ticket.created_at)}
                          </p>
                          {ticket.last_message_by === 'admin' && ticket.status !== 'closed' && (
                            <p className="text-xs text-emerald-500 mt-1 font-medium">✓ Admin respondeu</p>
                          )}
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {/* New Ticket Form */}
        {view === 'new' && (
          <motion.div
            key="new"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlassCard className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Assunto *</Label>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Descreva brevemente o problema"
                  className="bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mensagem *</Label>
                <Textarea
                  value={newInitialMessage}
                  onChange={(e) => setNewInitialMessage(e.target.value)}
                  placeholder="Descreva detalhadamente o seu problema ou dúvida..."
                  rows={5}
                  className="bg-background/50 resize-none"
                />
              </div>

              <Button 
                onClick={createTicket} 
                disabled={isCreating || !newSubject.trim() || !newCategory || !newInitialMessage.trim()}
                className="w-full gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Ticket
                  </>
                )}
              </Button>
            </GlassCard>
          </motion.div>
        )}

        {/* Chat View */}
        {view === 'chat' && selectedTicket && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-[calc(100vh-240px)]"
          >
            {/* Status banner */}
            {selectedTicket.status === 'closed' && (
              <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">Este ticket está encerrado.</span>
              </div>
            )}

            {/* Messages */}
            <GlassCard className="flex-1 overflow-y-auto p-4 mb-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.sender_type === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-br-md' 
                          : 'bg-muted rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender_type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {msg.sender_type === 'admin' ? 'Suporte • ' : ''}{formatDate(msg.created_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </GlassCard>

            {/* Input */}
            {selectedTicket.status !== 'closed' && (
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 bg-background/50"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isSending || !newMessage.trim()}
                  size="icon"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

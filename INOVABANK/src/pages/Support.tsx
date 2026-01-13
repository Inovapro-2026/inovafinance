import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle,
  Plus,
  Send,
  Paperclip,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  ChevronLeft,
  Loader2,
  X,
  User,
  Shield
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface Ticket {
  id: string;
  ticket_number: number;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  last_message_at: string;
  last_message_by: string;
}

interface Message {
  id: string;
  sender_type: string;
  message: string;
  attachment_url: string | null;
  created_at: string;
}

const CATEGORIES = [
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'afiliados', label: 'Afiliados' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'outro', label: 'Outro' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  'aberto': { label: 'Aberto', color: 'text-blue-600', bg: 'bg-blue-100', icon: MessageCircle },
  'em_atendimento': { label: 'Em atendimento', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
  'respondido': { label: 'Respondido', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
  'encerrado': { label: 'Encerrado', color: 'text-gray-600', bg: 'bg-gray-100', icon: AlertCircle },
};

export default function Support() {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [view, setView] = useState<'list' | 'chat' | 'new'>('list');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // New ticket form
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('outro');
  const [newMessage, setNewMessage] = useState('');
  
  // Chat message
  const [chatMessage, setChatMessage] = useState('');

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedTicket && view === 'chat') {
      loadMessages(selectedTicket.id);
      
      // Poll for new messages
      const interval = setInterval(() => {
        loadMessages(selectedTicket.id);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [selectedTicket, view]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTickets = async () => {
    if (!user) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_matricula', user.userId)
      .order('created_at', { ascending: false });

    if (data) {
      setTickets(data);
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

  const handleCreateTicket = async () => {
    if (!user || !newSubject.trim() || !newMessage.trim()) {
      toast({
        title: "Preencha todos os campos",
        description: "Assunto e mensagem são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_matricula: user.userId,
          subject: newSubject.trim(),
          category: newCategory,
          status: 'aberto'
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Add first message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_type: 'user',
          sender_matricula: user.userId,
          message: newMessage.trim()
        });

      if (messageError) throw messageError;

      toast({
        title: "Ticket criado!",
        description: `Ticket #${ticket.ticket_number} aberto com sucesso.`
      });

      setNewSubject('');
      setNewCategory('outro');
      setNewMessage('');
      setView('list');
      loadTickets();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o ticket.",
        variant: "destructive"
      });
    }

    setIsSending(false);
  };

  const handleSendMessage = async () => {
    if (!user || !selectedTicket || !chatMessage.trim()) return;
    if (selectedTicket.status === 'encerrado') {
      toast({
        title: "Ticket encerrado",
        description: "Este ticket foi encerrado. Entre em contato para reabri-lo.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);

    try {
      // Add message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: selectedTicket.id,
          sender_type: 'user',
          sender_matricula: user.userId,
          message: chatMessage.trim()
        });

      if (messageError) throw messageError;

      // Update ticket
      await supabase
        .from('support_tickets')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_by: 'user',
          status: selectedTicket.status === 'respondido' ? 'em_atendimento' : selectedTicket.status
        })
        .eq('id', selectedTicket.id);

      setChatMessage('');
      loadMessages(selectedTicket.id);
      loadTickets();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive"
      });
    }

    setIsSending(false);
  };

  const openTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setView('chat');
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

  if (isLoading) {
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
      <AnimatePresence mode="wait">
        {/* Ticket List View */}
        {view === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-2xl font-bold">Suporte</h1>
                <p className="text-muted-foreground text-sm">Central de atendimento</p>
              </div>
              <Button onClick={() => setView('new')} className="bg-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Novo Ticket
              </Button>
            </div>

            {tickets.length > 0 ? (
              <div className="space-y-3">
                {tickets.map((ticket) => {
                  const statusConfig = STATUS_CONFIG[ticket.status] || STATUS_CONFIG['aberto'];
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <motion.div key={ticket.id} variants={itemVariants}>
                      <GlassCard 
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openTicket(ticket)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                #{ticket.ticket_number}
                              </span>
                              <span className={`text-xs font-medium ${statusConfig.color} ${statusConfig.bg} px-2 py-0.5 rounded-full flex items-center gap-1`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig.label}
                              </span>
                            </div>
                            <h3 className="font-semibold text-sm mb-1">{ticket.subject}</h3>
                            <p className="text-xs text-muted-foreground capitalize">
                              {CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(ticket.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                            {ticket.last_message_by === 'admin' && ticket.status === 'respondido' && (
                              <span className="text-xs text-green-600 font-medium">
                                Admin respondeu
                              </span>
                            )}
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <GlassCard className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Nenhum ticket</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Você ainda não abriu nenhum ticket de suporte.
                </p>
                <Button onClick={() => setView('new')} className="bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Abrir primeiro ticket
                </Button>
              </GlassCard>
            )}
          </motion.div>
        )}

        {/* New Ticket View */}
        {view === 'new' && (
          <motion.div
            key="new"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" onClick={() => setView('list')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-display text-2xl font-bold">Novo Ticket</h1>
                <p className="text-muted-foreground text-sm">Descreva seu problema</p>
              </div>
            </div>

            <GlassCard className="p-5">
              <div className="space-y-4">
                <div>
                  <Label>Assunto *</Label>
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Ex: Problema com assinatura"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Categoria *</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Mensagem *</Label>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Descreva seu problema em detalhes..."
                    rows={5}
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleCreateTicket}
                  disabled={isSending}
                  className="w-full bg-primary text-primary-foreground"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar Ticket
                </Button>
              </div>
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
            className="flex flex-col h-[calc(100vh-180px)]"
          >
            {/* Chat Header */}
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setView('list')}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-sm">#{selectedTicket.ticket_number}</h2>
                  <span className={`text-xs font-medium ${STATUS_CONFIG[selectedTicket.status]?.color} ${STATUS_CONFIG[selectedTicket.status]?.bg} px-2 py-0.5 rounded-full`}>
                    {STATUS_CONFIG[selectedTicket.status]?.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedTicket.subject}</p>
              </div>
            </div>

            {/* Messages */}
            <GlassCard className="flex-1 p-4 overflow-y-auto mb-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${msg.sender_type === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className={`flex items-center gap-2 mb-1 ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          msg.sender_type === 'user' ? 'bg-primary/20' : 'bg-green-100'
                        }`}>
                          {msg.sender_type === 'user' ? (
                            <User className="w-3 h-3 text-primary" />
                          ) : (
                            <Shield className="w-3 h-3 text-green-600" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {msg.sender_type === 'user' ? 'Você' : 'Suporte'}
                        </span>
                      </div>
                      <div className={`rounded-2xl px-4 py-2 ${
                        msg.sender_type === 'user' 
                          ? 'bg-primary text-primary-foreground rounded-br-md' 
                          : 'bg-muted rounded-bl-md'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className={`text-xs text-muted-foreground mt-1 ${msg.sender_type === 'user' ? 'text-right' : 'text-left'}`}>
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </GlassCard>

            {/* Message Input */}
            {selectedTicket.status !== 'encerrado' ? (
              <div className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !chatMessage.trim()}
                  className="bg-primary text-primary-foreground"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Este ticket foi encerrado. Entre em contato para reabri-lo.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

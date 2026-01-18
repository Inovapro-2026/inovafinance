import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Plus, 
  Mic, 
  MicOff, 
  Clock, 
  Bell, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  CalendarDays,
  List,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { speak as speakTts, stopSpeaking } from '@/services/ttsService';
import { 
  getAgendaItems, 
  addAgendaItem, 
  deleteAgendaItem, 
  markAgendaItemComplete,
  getAgendaItemsForDate,
  AgendaItem,
  getTodayDate,
  formatTime
} from '@/lib/agendaDb';
import { 
  requestNotificationPermission, 
  hasNotificationPermission,
  sendNotification 
} from '@/services/notificationService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Calendar Component
function MiniCalendar({ 
  selectedDate, 
  onSelectDate,
  itemsByDate 
}: { 
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  itemsByDate: Record<string, number>;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  
  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };
  
  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };
  
  const getDateKey = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toISOString().split('T')[0];
  };
  
  const hasItems = (day: number) => {
    return (itemsByDate[getDateKey(day)] || 0) > 0;
  };
  
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <CardTitle className="text-lg">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
          {dayNames.map(day => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <motion.button
              key={index}
              whileTap={{ scale: 0.95 }}
              onClick={() => day && onSelectDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
              disabled={!day}
              className={cn(
                "relative aspect-square flex items-center justify-center text-sm rounded-lg transition-all",
                day ? "hover:bg-primary/10" : "",
                isSelected(day!) && "bg-primary text-primary-foreground",
                isToday(day!) && !isSelected(day!) && "ring-2 ring-primary/50",
                !day && "invisible"
              )}
            >
              {day}
              {day && hasItems(day) && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Add Item Dialog
function AddItemDialog({ 
  isOpen, 
  onClose, 
  onAdd,
  defaultDate 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: { titulo: string; data: string; hora: string; tipo: 'lembrete' | 'evento' }) => void;
  defaultDate: string;
}) {
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState(defaultDate);
  const [hora, setHora] = useState('09:00');
  const [tipo, setTipo] = useState<'lembrete' | 'evento'>('lembrete');

  useEffect(() => {
    setData(defaultDate);
  }, [defaultDate]);

  const handleSubmit = () => {
    if (!titulo.trim()) {
      toast.error('Digite um título');
      return;
    }
    onAdd({ titulo, data, hora, tipo });
    setTitulo('');
    setHora('09:00');
    setTipo('lembrete');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Novo Lembrete
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              placeholder="Ex: Reunião com cliente"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as 'lembrete' | 'evento')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lembrete">🔔 Lembrete</SelectItem>
                <SelectItem value="evento">📅 Evento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} className="w-full">
            <Check className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Agenda() {
  const { user } = useAuth();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [itemsByDate, setItemsByDate] = useState<Record<string, number>>({});
  const recognitionRef = useRef<any>(null);

  // Load items
  const loadItems = useCallback(async () => {
    if (!user) return;
    
    const userMatricula = user.userId;
    const dateStr = selectedDate.toISOString().split('T')[0];
    const dayItems = await getAgendaItemsForDate(userMatricula, dateStr);
    setItems(dayItems);
    
    // Load month overview for calendar dots
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    const monthItems = await getAgendaItems(
      userMatricula,
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    );
    
    const counts: Record<string, number> = {};
    monthItems.forEach(item => {
      counts[item.data] = (counts[item.data] || 0) + 1;
    });
    setItemsByDate(counts);
  }, [user, selectedDate]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Request notification permission on mount
  useEffect(() => {
    if (!hasNotificationPermission()) {
      requestNotificationPermission();
    }
  }, []);

  // Voice input handling
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Reconhecimento de voz não suportado');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Voice input:', transcript);
      await processVoiceCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast.error('Erro no reconhecimento de voz');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Process voice command
  const processVoiceCommand = async (command: string) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Call edge function to parse the command
      const { data, error } = await supabase.functions.invoke('parse-agenda-command', {
        body: { message: command }
      });

      if (error) throw error;

      console.log('Parsed command:', data);

      const userMatricula = user.userId;
      
      if (data.tipo === 'consulta') {
        // Handle query commands
        await handleConsulta(data.consulta_tipo);
      } else if (data.tipo === 'lembrete') {
        // Add reminder
        const item = await addAgendaItem({
          user_matricula: userMatricula,
          titulo: data.titulo,
          data: data.data,
          hora: data.hora,
          tipo: 'lembrete',
        });

        if (item) {
          toast.success('Lembrete criado!');
          speakTts('Lembrete salvo com sucesso.');
          await loadItems();
          
          // Schedule notification
          scheduleNotification(item);
        }
      }
    } catch (err) {
      console.error('Error processing command:', err);
      toast.error('Erro ao processar comando');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle query commands
  const handleConsulta = async (tipo: 'hoje' | 'amanha' | 'semana') => {
    if (!user) return;
    
    const userMatricula = user.userId;
    let targetDate = new Date();
    if (tipo === 'amanha') {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    const dateStr = targetDate.toISOString().split('T')[0];
    const dayItems = await getAgendaItemsForDate(userMatricula, dateStr);
    
    if (dayItems.length === 0) {
      const dayLabel = tipo === 'hoje' ? 'hoje' : 'amanhã';
      speakTts(`Você não tem lembretes para ${dayLabel}.`);
    } else {
      const itemList = dayItems.map(i => `${i.titulo} às ${formatTime(i.hora)}`).join(', ');
      const dayLabel = tipo === 'hoje' ? 'Hoje' : 'Amanhã';
      speakTts(`${dayLabel} você tem: ${itemList}.`);
    }
    
    setSelectedDate(targetDate);
  };

  // Schedule notification
  const scheduleNotification = (item: AgendaItem) => {
    const itemDateTime = new Date(`${item.data}T${item.hora}`);
    const notifyTime = new Date(itemDateTime.getTime() - (item.notificacao_minutos * 60 * 1000));
    const now = new Date();
    
    const delay = notifyTime.getTime() - now.getTime();
    
    if (delay > 0) {
      setTimeout(() => {
        sendNotification(
          `⏰ ${item.titulo}`,
          `Em ${item.notificacao_minutos} minutos`,
          `agenda-${item.id}`
        );
      }, delay);
    }
  };

  // Handle add item manually
  const handleAddItem = async (itemData: { titulo: string; data: string; hora: string; tipo: 'lembrete' | 'evento' }) => {
    if (!user) return;
    
    const userMatricula = user.userId;
    const item = await addAgendaItem({
      user_matricula: userMatricula,
      ...itemData,
    });

    if (item) {
      toast.success('Lembrete criado!');
      speakTts('Lembrete salvo com sucesso.');
      await loadItems();
      scheduleNotification(item);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    const success = await deleteAgendaItem(id);
    if (success) {
      toast.success('Removido!');
      await loadItems();
    }
  };

  // Handle complete
  const handleComplete = async (id: string, completed: boolean) => {
    const success = await markAgendaItemComplete(id, !completed);
    if (success) {
      await loadItems();
    }
  };

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === tomorrow.toDateString()) return 'Amanhã';
    
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Faça login para acessar</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Agenda
            </h1>
            <p className="text-sm text-muted-foreground">{formatDateLabel(selectedDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}
            >
              {view === 'calendar' ? <List className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Calendar */}
        {view === 'calendar' && (
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            itemsByDate={itemsByDate}
          />
        )}

        {/* Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {items.length > 0 ? `${items.length} lembrete${items.length > 1 ? 's' : ''}` : 'Nenhum lembrete'}
            </h2>
          </div>

          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn(
                  "bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden",
                  item.concluido && "opacity-60"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleComplete(item.id, item.concluido)}
                        className={cn(
                          "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                          item.concluido
                            ? "bg-green-500 border-green-500"
                            : "border-primary/50 hover:border-primary"
                        )}
                      >
                        {item.concluido && <Check className="w-3 h-3 text-white" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "font-medium truncate",
                          item.concluido && "line-through text-muted-foreground"
                        )}>
                          {item.titulo}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{formatTime(item.hora)}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.tipo === 'lembrete' ? '🔔' : '📅'} {item.tipo}
                          </Badge>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {items.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum lembrete para este dia</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Toque no microfone e diga "Me lembre de..."
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating Mic Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isListening ? stopListening : startListening}
        disabled={isLoading}
        className={cn(
          "fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-50",
          isListening
            ? "bg-red-500 animate-pulse"
            : "bg-primary hover:bg-primary/90",
          isLoading && "opacity-50"
        )}
      >
        {isListening ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </motion.button>

      {/* Add Dialog */}
      <AddItemDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddItem}
        defaultDate={selectedDate.toISOString().split('T')[0]}
      />
    </div>
  );
}

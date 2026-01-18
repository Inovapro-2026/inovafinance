import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Volume2, VolumeX, Keyboard, Calendar, RefreshCw, X, Send, BellRing } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { speak as speakTts, stopSpeaking } from '@/services/ttsService';
import { addAgendaItem, formatTime, getTodayDate } from '@/lib/agendaDb';
import { addRotina, DIAS_SEMANA_LABEL } from '@/lib/agendaDb';
import { requestNotificationPermission, hasNotificationPermission, sendNotification, getNotificationPermissionStatus } from '@/services/notificationService';
import isaBackground from '@/assets/isa-background.jpg';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AgendaFormModal, AgendaFormData } from '@/components/AgendaFormModal';

// Sugestões rotativas para agenda/rotinas
const SUGGESTIONS = [
  { icon: Calendar, text: "Me lembre de reunião amanhã às 14h", color: "blue" },
  { icon: RefreshCw, text: "Adicionar academia segunda a sexta às 7h", color: "purple" },
  { icon: Calendar, text: "Consulta dia 22 às 16h", color: "green" },
  { icon: RefreshCw, text: "Rotina estudar todo dia às 20h", color: "orange" },
];

// Componente de sugestão rotativa
function RotatingSuggestion({ onSelect, disabled }: { onSelect: (text: string) => void; disabled: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SUGGESTIONS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const current = SUGGESTIONS[currentIndex];
  const Icon = current.icon;

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    orange: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
  };

  return (
    <AnimatePresence mode="wait">
      <motion.button
        key={currentIndex}
        disabled={disabled}
        onClick={() => onSelect(current.text)}
        className={cn(
          "px-4 py-2.5 text-sm rounded-full transition-all border flex items-center gap-2 backdrop-blur-sm",
          disabled ? "opacity-50 cursor-not-allowed" : cn("cursor-pointer", colorClasses[current.color])
        )}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ duration: 0.4 }}
        whileHover={!disabled ? { scale: 1.05 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
      >
        <Icon className="w-4 h-4" />
        <span>{current.text}</span>
        <div className="flex gap-1 ml-2">
          {SUGGESTIONS.map((_, i) => (
            <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all", i === currentIndex ? "bg-current" : "bg-current/30")} />
          ))}
        </div>
      </motion.button>
    </AnimatePresence>
  );
}

// Componente de confirmação pop-out
function ConfirmationPopup({ message, isVisible, onClose }: { message: string; isVisible: boolean; onClose: () => void }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-32 left-4 right-4 z-50"
        >
          <div className="bg-green-500/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              ✓
            </div>
            <p className="font-medium flex-1">{message}</p>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AssistenteVoz() {
  const { user } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [inputText, setInputText] = useState('');
  const [statusText, setStatusText] = useState('Toque para falar');
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [extractedTitle, setExtractedTitle] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'default'>(
    getNotificationPermissionStatus()
  );
  const recognitionRef = useRef<any>(null);

  // Check notification permission on mount and focus
  useEffect(() => {
    const checkPermission = () => {
      setNotificationPermission(getNotificationPermissionStatus());
    };
    checkPermission();
    window.addEventListener('focus', checkPermission);
    return () => window.removeEventListener('focus', checkPermission);
  }, []);

  // Request notification permission
  const handleRequestNotification = async () => {
    try {
      const granted = await requestNotificationPermission();
      // Re-check actual permission status after request
      const actualStatus = getNotificationPermissionStatus();
      setNotificationPermission(actualStatus);
      
      if (granted) {
        toast.success('Notificações ativadas! 🔔');
      } else {
        toast.error('Permissão negada. Ative nas configurações do navegador.');
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      toast.error('Erro ao solicitar permissão');
    }
  };

  // Start voice recognition
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
      setStatusText('Ouvindo...');
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setStatusText('Processando...');
      await processCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setStatusText('Toque para falar');
      if (event.error === 'not-allowed') {
        toast.error('Permita o acesso ao microfone');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!isProcessing) {
        setStatusText('Toque para falar');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isProcessing]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setStatusText('Toque para falar');
  }, []);

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Extract title from command text
  const extractTitleFromCommand = (text: string): string => {
    const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Remove common prefixes
    let title = normalized
      .replace(/^(me lembre de|me lembra de|lembre-me de|lembra-me de|lembrar de|lembrar|me avise para|me avisa para|avise-me para|avisa-me para|agendar|agenda|criar rotina para|criar rotina de|adicionar rotina para|adicionar rotina de|adicionar|criar lembrete para|criar lembrete de|marcar|marque)\s*/i, '')
      .trim();
    
    // Remove time references
    title = title
      .replace(/\s*(as|às|a|para)\s+\d{1,2}(:\d{2})?\s*(h|horas?)?/gi, '')
      .replace(/\s*(amanha|hoje|depois de amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo)/gi, '')
      .replace(/\s*(dia\s+)?\d{1,2}(\s*de\s*(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))?/gi, '')
      .replace(/\s*(todo dia|todos os dias|segunda a sexta|seg a sex)/gi, '')
      .trim();
    
    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  };

  // Check if command is an agenda-related command
  const isAgendaCommand = (text: string): boolean => {
    const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const agendaKeywords = [
      'me lembre', 'me lembra', 'lembre-me', 'lembra-me', 'lembrar',
      'me avise', 'me avisa', 'avise-me', 'avisa-me',
      'agendar', 'agenda', 'marcar', 'marque',
      'criar rotina', 'adicionar rotina', 'criar lembrete',
      'rotina de', 'rotina para'
    ];
    return agendaKeywords.some(keyword => normalized.includes(keyword));
  };

  // Process command - opens modal for user to confirm details
  const processCommand = async (command: string) => {
    if (!user || !command.trim()) return;

    setIsProcessing(true);
    setStatusText('Processando...');

    try {
      // Check if command is about finances (should reject)
      const financeKeywords = ['saldo', 'dinheiro', 'conta', 'cartão', 'cartao', 'crédito', 'credito', 'débito', 'debito', 'gasto', 'despesa', 'receita', 'transferir', 'pix', 'boleto', 'pagamento', 'pagar conta'];
      const normalizedCommand = command.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      const isFinanceCommand = financeKeywords.some(keyword => normalizedCommand.includes(keyword));
      
      if (isFinanceCommand) {
        const msg = "Posso te ajudar apenas com agenda e rotinas.";
        if (voiceEnabled) speakTts(msg);
        toast.info(msg);
        setStatusText('Toque para falar');
        setIsProcessing(false);
        return;
      }

      // Check if it's an agenda/reminder command
      if (isAgendaCommand(command)) {
        // Extract title and open modal
        const title = extractTitleFromCommand(command);
        setExtractedTitle(title);
        setShowAgendaModal(true);
        
        if (voiceEnabled) {
          speakTts('Ok, complete os detalhes no formulário.');
        }
        setStatusText('Toque para falar');
        setIsProcessing(false);
        return;
      }

      // Check for query commands
      const queryKeywords = ['o que tenho', 'quais compromissos', 'minha agenda', 'meus lembretes', 'compromissos de'];
      const isQueryCommand = queryKeywords.some(keyword => normalizedCommand.includes(keyword));

      if (isQueryCommand) {
        // Determine query type
        let queryType: 'hoje' | 'amanha' | 'semana' = 'hoje';
        if (normalizedCommand.includes('amanha')) {
          queryType = 'amanha';
        } else if (normalizedCommand.includes('semana')) {
          queryType = 'semana';
        }
        await handleConsulta(queryType);
      } else {
        // Unknown command - suggest what the assistant can do
        const msg = "Diga 'me lembre de...' ou 'agendar...' para criar lembretes e rotinas.";
        if (voiceEnabled) speakTts(msg);
        toast.info(msg);
      }
    } catch (err) {
      console.error('Error processing command:', err);
      toast.error('Erro ao processar comando');
    } finally {
      setIsProcessing(false);
      setStatusText('Toque para falar');
    }
  };

  // Handle form submission from modal
  const handleAgendaFormSubmit = async (formData: AgendaFormData) => {
    if (!user) return;

    const userMatricula = user.userId;

    try {
      if (formData.tipo === 'rotina') {
        const rotina = await addRotina({
          user_matricula: userMatricula,
          titulo: formData.titulo,
          dias_semana: formData.dias_semana,
          hora: formData.hora,
        });

        if (rotina) {
          const diasLabel = formData.dias_semana.length === 7
            ? 'todos os dias'
            : formData.dias_semana.length === 5
              ? 'segunda a sexta'
              : formData.dias_semana.map((d: string) => DIAS_SEMANA_LABEL[d] || d).join(', ');

          const confirmation = `✅ Rotina criada: ${formData.titulo}, ${diasLabel} às ${formatTime(formData.hora)}.`;
          
          setConfirmationMessage(confirmation);
          setShowConfirmation(true);
          
          if (voiceEnabled) {
            speakTts(`Rotina adicionada: ${formData.titulo}, ${diasLabel} às ${formatTime(formData.hora)}.`);
          }

          scheduleRotinaNotification(formData.titulo, formData.hora, formData.dias_semana);
        }
      } else {
        const item = await addAgendaItem({
          user_matricula: userMatricula,
          titulo: formData.titulo,
          data: formData.data,
          hora: formData.hora,
          tipo: 'lembrete',
        });

        if (item) {
          const dateLabel = getDateLabel(formData.data);
          const confirmation = `✅ Lembrete agendado para ${dateLabel} às ${formatTime(formData.hora)}.`;
          
          setConfirmationMessage(confirmation);
          setShowConfirmation(true);
          
          if (voiceEnabled) {
            speakTts(`Lembrete salvo: ${formData.titulo}, ${dateLabel} às ${formatTime(formData.hora)}.`);
          }

          scheduleAgendaNotification(item.id, formData.titulo, formData.data, formData.hora);
        }
      }
    } catch (err) {
      console.error('Error saving agenda item:', err);
      toast.error('Erro ao salvar');
    }
  };

  // Handle consulta (query)
  const handleConsulta = async (tipo: 'hoje' | 'amanha' | 'semana') => {
    if (!user) return;

    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const userMatricula = user.userId;
    const targetDate = new Date();
    if (tipo === 'amanha') {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const dateStr = formatLocalDate(targetDate);
    
    const { data: items } = await supabase
      .from('agenda_items')
      .select('*')
      .eq('user_matricula', userMatricula)
      .eq('data', dateStr)
      .order('hora', { ascending: true });

    const dayLabel = tipo === 'hoje' ? 'hoje' : 'amanhã';

    if (!items || items.length === 0) {
      const msg = `Você não tem lembretes para ${dayLabel}.`;
      if (voiceEnabled) speakTts(msg);
      toast.info(msg);
    } else {
      const itemList = items.map((i: any) => `${i.titulo} às ${formatTime(i.hora)}`).join(', ');
      const msg = `Para ${dayLabel} você tem: ${itemList}.`;
      if (voiceEnabled) speakTts(msg);
      toast.success(`${items.length} lembrete(s) para ${dayLabel}`);
    }
  };

  // Get date label
  const getDateLabel = (dateStr: string): string => {
    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const today = getTodayDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatLocalDate(tomorrow);

    if (dateStr === today) return 'hoje';
    if (dateStr === tomorrowStr) return 'amanhã';

    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  };

  // Schedule agenda notification
  const scheduleAgendaNotification = (id: string, titulo: string, data: string, hora: string) => {
    const itemDateTime = new Date(`${data}T${hora}`);
    const notifyTime = new Date(itemDateTime.getTime() - 15 * 60 * 1000); // 15 min before
    const now = new Date();

    const delay = notifyTime.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(() => {
        sendNotification(`⏰ ${titulo}`, 'Em 15 minutos', `agenda-${id}`);
      }, delay);
    }

    // Also at exact time
    const exactDelay = itemDateTime.getTime() - now.getTime();
    if (exactDelay > 0) {
      setTimeout(() => {
        sendNotification(`🔔 ${titulo}`, 'Agora!', `agenda-now-${id}`);
      }, exactDelay);
    }
  };

  // Schedule rotina notification
  const scheduleRotinaNotification = (titulo: string, hora: string, dias: string[]) => {
    // This is a simplified version - in production you'd use a service worker
    console.log('Scheduled rotina notification:', { titulo, hora, dias });
  };

  // Handle text input submit
  const handleTextSubmit = async () => {
    if (!inputText.trim()) return;
    await processCommand(inputText);
    setInputText('');
    setShowKeyboard(false);
  };

  // Handle suggestion click
  const handleSuggestionClick = async (text: string) => {
    await processCommand(text);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Faça login para acessar</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pb-24">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={isaBackground}
          alt="ISA Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-8">
          <div className="text-white">
            <p className="text-sm opacity-80">Olá,</p>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {user.fullName?.split(' ')[0] || 'Usuário'} 👋
            </h1>
          </div>
          
          {/* Voice Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md transition-all",
              voiceEnabled ? "bg-primary/80 text-white" : "bg-white/20 text-white/60"
            )}
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Title */}
        <div className="text-center px-4 mt-4">
          <h2 className="text-xl font-semibold text-white drop-shadow-lg">INOVA</h2>
          <p className="text-sm text-white/80">Sua Assistente de Rotinas</p>
        </div>

        {/* Notification Permission Banner */}
        {notificationPermission !== 'granted' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mt-4"
          >
            <button
              onClick={handleRequestNotification}
              className="w-full flex items-center gap-3 p-3 bg-primary/90 backdrop-blur-sm text-primary-foreground rounded-xl shadow-lg"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <BellRing className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">Ativar notificações</p>
                <p className="text-xs opacity-80">Receba lembretes no horário certo</p>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Permitir</span>
            </button>
          </motion.div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Microphone Button */}
        <div className="flex flex-col items-center">
          <motion.button
            onClick={handleMicClick}
            disabled={isProcessing}
            className={cn(
              "w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-all",
              isListening
                ? "bg-red-500 shadow-red-500/50"
                : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/40"
            )}
            whileTap={{ scale: 0.95 }}
            animate={isListening ? {
              scale: [1, 1.1, 1],
              boxShadow: ['0 0 0 0 rgba(239, 68, 68, 0.4)', '0 0 0 20px rgba(239, 68, 68, 0)', '0 0 0 0 rgba(239, 68, 68, 0)']
            } : {}}
            transition={isListening ? { repeat: Infinity, duration: 1.5 } : {}}
          >
            <Mic className={cn("w-10 h-10 text-white", isListening && "animate-pulse")} />
          </motion.button>

          {/* Status Text */}
          <motion.p
            className="mt-4 text-lg font-medium text-white/90"
            animate={{ opacity: isProcessing ? [1, 0.5, 1] : 1 }}
            transition={isProcessing ? { repeat: Infinity, duration: 1 } : {}}
          >
            {statusText}
          </motion.p>
        </div>

        {/* Suggestions */}
        <div className="flex justify-center px-4 mt-6">
          <RotatingSuggestion
            onSelect={handleSuggestionClick}
            disabled={isListening || isProcessing}
          />
        </div>

        {/* Keyboard Toggle */}
        <div className="flex justify-center mt-4 mb-8">
          <button
            onClick={() => setShowKeyboard(!showKeyboard)}
            className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all"
          >
            <Keyboard className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Keyboard Input */}
        <AnimatePresence>
          {showKeyboard && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-24 left-4 right-4"
            >
              <div className="flex gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-3 rounded-2xl shadow-xl">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Digite seu comando..."
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0"
                  onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                  autoFocus
                />
                <Button
                  size="icon"
                  onClick={handleTextSubmit}
                  disabled={!inputText.trim() || isProcessing}
                >
                  <Send className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowKeyboard(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Popup */}
      <ConfirmationPopup
        message={confirmationMessage}
        isVisible={showConfirmation}
        onClose={() => setShowConfirmation(false)}
      />

      {/* Agenda Form Modal */}
      <AgendaFormModal
        isOpen={showAgendaModal}
        onClose={() => setShowAgendaModal(false)}
        onSubmit={handleAgendaFormSubmit}
        initialTitle={extractedTitle}
      />
    </div>
  );
}

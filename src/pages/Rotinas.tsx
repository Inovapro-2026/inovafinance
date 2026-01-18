import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RefreshCw, 
  Plus, 
  Mic, 
  MicOff, 
  Clock, 
  Bell, 
  Check, 
  Pause,
  Play,
  Trash2,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { speak as speakTts } from '@/services/ttsService';
import { 
  getRotinas, 
  addRotina, 
  deleteRotina, 
  toggleRotinaActive,
  getRotinaCompletionsForDate,
  markRotinaComplete,
  unmarkRotinaComplete,
  getRotinasForToday,
  isRotinaCompletedToday,
  Rotina,
  RotinaCompletion,
  getTodayDate,
  formatTime,
  DIAS_SEMANA_LABEL
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
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Add Rotina Dialog
function AddRotinaDialog({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean;
  onClose: () => void;
  onAdd: (rotina: { titulo: string; dias_semana: string[]; hora: string }) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [hora, setHora] = useState('07:00');
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>(['segunda', 'terca', 'quarta', 'quinta', 'sexta']);

  const toggleDia = (dia: string) => {
    setDiasSelecionados(prev => 
      prev.includes(dia) 
        ? prev.filter(d => d !== dia)
        : [...prev, dia]
    );
  };

  const handleSubmit = () => {
    if (!titulo.trim()) {
      toast.error('Digite um título');
      return;
    }
    if (diasSelecionados.length === 0) {
      toast.error('Selecione pelo menos um dia');
      return;
    }
    onAdd({ titulo, dias_semana: diasSelecionados, hora });
    setTitulo('');
    setHora('07:00');
    setDiasSelecionados(['segunda', 'terca', 'quarta', 'quinta', 'sexta']);
    onClose();
  };

  const diasOrdenados = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Nova Rotina
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              placeholder="Ex: Ir para academia"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Horário</Label>
            <Input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Dias da semana</Label>
            <div className="flex flex-wrap gap-2">
              {diasOrdenados.map(dia => (
                <button
                  key={dia}
                  onClick={() => toggleDia(dia)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    diasSelecionados.includes(dia)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {DIAS_SEMANA_LABEL[dia]?.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full">
            <Check className="w-4 h-4 mr-2" />
            Criar Rotina
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Rotinas() {
  const { user } = useAuth();
  const [allRotinas, setAllRotinas] = useState<Rotina[]>([]);
  const [todayRotinas, setTodayRotinas] = useState<Rotina[]>([]);
  const [completions, setCompletions] = useState<RotinaCompletion[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  const recognitionRef = useRef<any>(null);

  // Load rotinas
  const loadRotinas = useCallback(async () => {
    if (!user) return;
    
    const userMatricula = user.userId;
    const rotinas = await getRotinas(userMatricula);
    setAllRotinas(rotinas);
    
    const today = getRotinasForToday(rotinas);
    setTodayRotinas(today);
    
    const todayCompletions = await getRotinaCompletionsForDate(userMatricula, getTodayDate());
    setCompletions(todayCompletions);
  }, [user]);

  useEffect(() => {
    loadRotinas();
  }, [loadRotinas]);

  // Request notification permission on mount
  useEffect(() => {
    if (!hasNotificationPermission()) {
      requestNotificationPermission();
    }
  }, []);

  // Calculate progress
  const completedCount = todayRotinas.filter(r => isRotinaCompletedToday(r.id, completions)).length;
  const totalCount = todayRotinas.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

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
      
      if (data.tipo === 'rotina') {
        // Add routine
        const rotina = await addRotina({
          user_matricula: userMatricula,
          titulo: data.titulo,
          dias_semana: data.dias_semana,
          hora: data.hora,
        });

        if (rotina) {
          toast.success('Rotina criada!');
          const diasLabel = data.dias_semana.length === 7 
            ? 'todos os dias' 
            : data.dias_semana.length === 5 
              ? 'de segunda a sexta'
              : data.dias_semana.map((d: string) => DIAS_SEMANA_LABEL[d]).join(', ');
          speakTts(`Rotina adicionada: ${data.titulo}, ${diasLabel} às ${formatTime(data.hora)}.`);
          await loadRotinas();
        }
      } else if (data.tipo === 'consulta') {
        // Handle query
        if (todayRotinas.length === 0) {
          speakTts('Você não tem rotinas para hoje.');
        } else {
          const pending = todayRotinas.filter(r => !isRotinaCompletedToday(r.id, completions));
          if (pending.length === 0) {
            speakTts('Parabéns! Você completou todas as rotinas de hoje.');
          } else {
            const list = pending.map(r => `${r.titulo} às ${formatTime(r.hora)}`).join(', ');
            speakTts(`Você ainda tem ${pending.length} rotinas pendentes: ${list}.`);
          }
        }
      }
    } catch (err) {
      console.error('Error processing command:', err);
      toast.error('Erro ao processar comando');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add rotina manually
  const handleAddRotina = async (rotinaData: { titulo: string; dias_semana: string[]; hora: string }) => {
    if (!user) return;
    
    const userMatricula = user.userId;
    const rotina = await addRotina({
      user_matricula: userMatricula,
      ...rotinaData,
    });

    if (rotina) {
      toast.success('Rotina criada!');
      speakTts('Rotina adicionada.');
      await loadRotinas();
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    const success = await deleteRotina(id);
    if (success) {
      toast.success('Rotina removida!');
      await loadRotinas();
    }
  };

  // Handle toggle active
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const success = await toggleRotinaActive(id, !currentActive);
    if (success) {
      toast.success(currentActive ? 'Rotina pausada' : 'Rotina ativada');
      await loadRotinas();
    }
  };

  // Handle complete
  const handleComplete = async (rotinaId: string) => {
    if (!user) return;
    
    const userMatricula = user.userId;
    const isCompleted = isRotinaCompletedToday(rotinaId, completions);
    
    if (isCompleted) {
      const success = await unmarkRotinaComplete(rotinaId, getTodayDate());
      if (success) {
        await loadRotinas();
      }
    } else {
      const success = await markRotinaComplete(rotinaId, userMatricula, getTodayDate());
      if (success) {
        await loadRotinas();
        
        // Check if all completed
        const newCompletedCount = completedCount + 1;
        if (newCompletedCount === totalCount) {
          speakTts('Parabéns! Você completou todas as rotinas de hoje!');
          toast.success('🎉 Todas as rotinas completas!');
        }
      }
    }
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
              <RefreshCw className="w-5 h-5 text-primary" />
              Rotinas
            </h1>
            <p className="text-sm text-muted-foreground">
              {completedCount}/{totalCount} completas hoje
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'today' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('today')}
            >
              Hoje
            </Button>
            <Button
              variant={viewMode === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('all')}
            >
              Todas
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
        
        {/* Progress Bar */}
        {viewMode === 'today' && totalCount > 0 && (
          <div className="mt-3">
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Today's Rotinas */}
        {viewMode === 'today' && (
          <AnimatePresence mode="popLayout">
            {todayRotinas.map((rotina, index) => {
              const isCompleted = isRotinaCompletedToday(rotina.id, completions);
              
              return (
                <motion.div
                  key={rotina.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    "bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden transition-all",
                    isCompleted && "bg-green-500/10 border-green-500/30"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleComplete(rotina.id)}
                          className={cn(
                            "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                            isCompleted
                              ? "bg-green-500 border-green-500"
                              : "border-primary/50 hover:border-primary hover:bg-primary/10"
                          )}
                        >
                          {isCompleted && <Check className="w-5 h-5 text-white" />}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className={cn(
                            "font-medium truncate",
                            isCompleted && "line-through text-muted-foreground"
                          )}>
                            {rotina.titulo}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{formatTime(rotina.hora)}</span>
                          </div>
                        </div>
                        
                        {isCompleted && (
                          <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30">
                            ✓ Feito
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* All Rotinas */}
        {viewMode === 'all' && (
          <AnimatePresence mode="popLayout">
            {allRotinas.map((rotina, index) => (
              <motion.div
                key={rotina.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={cn(
                  "bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden",
                  !rotina.ativo && "opacity-60"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        rotina.ativo ? "bg-primary/20" : "bg-muted"
                      )}>
                        <RefreshCw className={cn(
                          "w-5 h-5",
                          rotina.ativo ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{rotina.titulo}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{formatTime(rotina.hora)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {rotina.dias_semana.map(dia => (
                            <Badge key={dia} variant="outline" className="text-xs">
                              {DIAS_SEMANA_LABEL[dia]?.slice(0, 3)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(rotina.id, rotina.ativo)}
                          className={rotina.ativo ? "text-amber-500" : "text-green-500"}
                        >
                          {rotina.ativo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(rotina.id)}
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
        )}

        {/* Empty states */}
        {viewMode === 'today' && todayRotinas.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhuma rotina para hoje</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Crie rotinas recorrentes para seus hábitos
            </p>
          </motion.div>
        )}

        {viewMode === 'all' && allRotinas.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <RefreshCw className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhuma rotina criada</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Diga "Criar rotina ir para academia de segunda a sexta às 7"
            </p>
          </motion.div>
        )}
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
      <AddRotinaDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddRotina}
      />
    </div>
  );
}

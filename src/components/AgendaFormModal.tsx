import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Clock, Bell, RefreshCw } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';

interface AgendaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AgendaFormData) => void;
  initialTitle?: string;
}

export interface AgendaFormData {
  titulo: string;
  tipo: 'lembrete' | 'rotina';
  data: string; // YYYY-MM-DD (only for lembrete)
  hora: string;
  dias_semana: string[]; // only for rotina
}

const DIAS_SEMANA = [
  { value: 'dom', label: 'D' },
  { value: 'seg', label: 'S' },
  { value: 'ter', label: 'T' },
  { value: 'qua', label: 'Q' },
  { value: 'qui', label: 'Q' },
  { value: 'sex', label: 'S' },
  { value: 'sab', label: 'S' },
];

const HORAS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const MINUTOS = Array.from({ length: 60 }, (_, m) => String(m).padStart(2, '0'));

export function AgendaFormModal({ isOpen, onClose, onSubmit, initialTitle = '' }: AgendaFormModalProps) {
  const [titulo, setTitulo] = useState(initialTitle);
  const [tipo, setTipo] = useState<'lembrete' | 'rotina'>('lembrete');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [hora, setHora] = useState('09:00');
  const [diasSemana, setDiasSemana] = useState<string[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitulo(initialTitle);
      setSelectedDate(new Date());
      setHora('09:00');
      setDiasSemana([]);
      setTipo('lembrete');
    }
  }, [isOpen, initialTitle]);

  const handleSubmit = () => {
    if (!titulo.trim()) return;
    if (tipo === 'lembrete' && !selectedDate) return;
    if (tipo === 'rotina' && diasSemana.length === 0) return;

    const formatLocalDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    onSubmit({
      titulo: titulo.trim(),
      tipo,
      data: selectedDate ? formatLocalDate(selectedDate) : '',
      hora,
      dias_semana: diasSemana,
    });
    onClose();
  };

  const toggleDia = (dia: string) => {
    setDiasSemana(prev => 
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const formatDateLabel = (date: Date | undefined) => {
    if (!date) return 'Selecionar data';
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Novo Agendamento</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Tipo Toggle */}
              <div className="flex gap-2 p-1 bg-muted rounded-xl">
                <button
                  onClick={() => setTipo('lembrete')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all",
                    tipo === 'lembrete' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <Bell className="w-4 h-4" />
                  Lembrete
                </button>
                <button
                  onClick={() => setTipo('rotina')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all",
                    tipo === 'rotina' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                  Rotina
                </button>
              </div>

              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="titulo">O que você precisa fazer?</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Ir no mercado, Reunião..."
                  className="h-12 text-base"
                  autoFocus
                />
              </div>

              {/* Data (apenas para lembrete) */}
              {tipo === 'lembrete' && (
                <div className="space-y-2">
                  <Label>Data</Label>
                  <button
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="w-full h-12 px-4 flex items-center gap-3 bg-muted/50 border border-border rounded-xl hover:bg-muted transition-colors"
                  >
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    <span className="flex-1 text-left">{formatDateLabel(selectedDate)}</span>
                  </button>
                  
                  <AnimatePresence>
                    {showCalendar && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-card rounded-xl border border-border p-2 mt-2">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date);
                              setShowCalendar(false);
                            }}
                            locale={ptBR}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            className="pointer-events-auto"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Dias da semana (apenas para rotina) */}
              {tipo === 'rotina' && (
                <div className="space-y-2">
                  <Label>Dias da semana</Label>
                  <div className="flex gap-2">
                    {DIAS_SEMANA.map((dia, index) => (
                      <button
                        key={dia.value}
                        onClick={() => toggleDia(dia.value)}
                        className={cn(
                          "w-10 h-10 rounded-full font-medium transition-all text-sm",
                          diasSemana.includes(dia.value)
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {dia.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setDiasSemana(['seg', 'ter', 'qua', 'qui', 'sex'])}
                      className="text-xs text-primary hover:underline"
                    >
                      Seg a Sex
                    </button>
                    <button
                      onClick={() => setDiasSemana(['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'])}
                      className="text-xs text-primary hover:underline"
                    >
                      Todos os dias
                    </button>
                    <button
                      onClick={() => setDiasSemana(['sab', 'dom'])}
                      className="text-xs text-primary hover:underline"
                    >
                      Fins de semana
                    </button>
                  </div>
                </div>
              )}

              {/* Hora */}
              <div className="space-y-2">
                <Label>Horário</Label>
                <button
                  onClick={() => setShowTimePicker(!showTimePicker)}
                  className="w-full h-12 px-4 flex items-center gap-3 bg-muted/50 border border-border rounded-xl hover:bg-muted transition-colors"
                >
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="flex-1 text-left text-lg font-medium">{hora}</span>
                </button>

                <AnimatePresence>
                  {showTimePicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-card rounded-xl border border-border p-4 mt-2">
                        <div className="flex items-center justify-center gap-2">
                          {/* Seletor de Hora */}
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-muted-foreground mb-2">Hora</span>
                            <div className="h-48 overflow-y-auto scrollbar-thin bg-muted/30 rounded-xl p-1">
                              <div className="flex flex-col gap-1">
                                {HORAS.map((h) => (
                                  <button
                                    key={h}
                                    onClick={() => setHora(`${h}:${hora.split(':')[1]}`)}
                                    className={cn(
                                      "w-14 py-2 rounded-lg text-lg font-medium transition-all",
                                      hora.split(':')[0] === h
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "hover:bg-muted text-foreground"
                                    )}
                                  >
                                    {h}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <span className="text-3xl font-bold text-primary">:</span>

                          {/* Seletor de Minuto */}
                          <div className="flex flex-col items-center">
                            <span className="text-xs text-muted-foreground mb-2">Min</span>
                            <div className="h-48 overflow-y-auto scrollbar-thin bg-muted/30 rounded-xl p-1">
                              <div className="flex flex-col gap-1">
                                {MINUTOS.map((m) => (
                                  <button
                                    key={m}
                                    onClick={() => setHora(`${hora.split(':')[0]}:${m}`)}
                                    className={cn(
                                      "w-14 py-2 rounded-lg text-lg font-medium transition-all",
                                      hora.split(':')[1] === m
                                        ? "bg-primary text-primary-foreground shadow-md"
                                        : "hover:bg-muted text-foreground"
                                    )}
                                  >
                                    {m}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => setShowTimePicker(false)}
                          className="w-full mt-4"
                          size="sm"
                        >
                          Confirmar
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleSubmit}
                className="w-full h-12 text-base font-medium"
                disabled={
                  !titulo.trim() ||
                  (tipo === 'lembrete' && !selectedDate) ||
                  (tipo === 'rotina' && diasSemana.length === 0)
                }
              >
                {tipo === 'lembrete' ? 'Salvar Lembrete' : 'Salvar Rotina'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

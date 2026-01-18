// Database operations for Agenda & Routines (INOVAFINANCE LIFE ASSISTANT)
import { supabase } from '@/integrations/supabase/client';

// Types
export interface AgendaItem {
  id: string;
  user_matricula: number;
  titulo: string;
  descricao: string | null;
  data: string; // date in YYYY-MM-DD format
  hora: string; // time in HH:MM format
  tipo: 'lembrete' | 'evento';
  notificacao_minutos: number;
  concluido: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rotina {
  id: string;
  user_matricula: number;
  titulo: string;
  dias_semana: string[]; // ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo']
  hora: string; // time in HH:MM format
  ativo: boolean;
  notificacao_minutos: number;
  created_at: string;
  updated_at: string;
}

export interface RotinaCompletion {
  id: string;
  rotina_id: string;
  user_matricula: number;
  data_conclusao: string;
  created_at: string;
}

// Day of week mapping
export const DIAS_SEMANA = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
} as const;

export const DIAS_SEMANA_LABEL: Record<string, string> = {
  domingo: 'Domingo',
  segunda: 'Segunda',
  terca: 'Terça',
  quarta: 'Quarta',
  quinta: 'Quinta',
  sexta: 'Sexta',
  sabado: 'Sábado',
};

// ===================
// AGENDA ITEMS
// ===================

export async function getAgendaItems(userMatricula: number, startDate?: string, endDate?: string): Promise<AgendaItem[]> {
  let query = supabase
    .from('agenda_items')
    .select('*')
    .eq('user_matricula', userMatricula)
    .order('data', { ascending: true })
    .order('hora', { ascending: true });

  if (startDate) {
    query = query.gte('data', startDate);
  }
  if (endDate) {
    query = query.lte('data', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching agenda items:', error);
    return [];
  }

  return (data || []) as AgendaItem[];
}

export async function getAgendaItemsForDate(userMatricula: number, date: string): Promise<AgendaItem[]> {
  const { data, error } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('user_matricula', userMatricula)
    .eq('data', date)
    .order('hora', { ascending: true });

  if (error) {
    console.error('Error fetching agenda items for date:', error);
    return [];
  }

  return (data || []) as AgendaItem[];
}

export async function addAgendaItem(item: {
  user_matricula: number;
  titulo: string;
  descricao?: string;
  data: string;
  hora: string;
  tipo?: 'lembrete' | 'evento';
  notificacao_minutos?: number;
}): Promise<AgendaItem | null> {
  const { data, error } = await supabase
    .from('agenda_items')
    .insert({
      user_matricula: item.user_matricula,
      titulo: item.titulo,
      descricao: item.descricao || null,
      data: item.data,
      hora: item.hora,
      tipo: item.tipo || 'lembrete',
      notificacao_minutos: item.notificacao_minutos ?? 15,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding agenda item:', error);
    return null;
  }

  return data as AgendaItem;
}

export async function updateAgendaItem(
  id: string,
  updates: Partial<Pick<AgendaItem, 'titulo' | 'descricao' | 'data' | 'hora' | 'tipo' | 'notificacao_minutos' | 'concluido'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('agenda_items')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating agenda item:', error);
    return false;
  }

  return true;
}

export async function deleteAgendaItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('agenda_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting agenda item:', error);
    return false;
  }

  return true;
}

export async function markAgendaItemComplete(id: string, concluido: boolean): Promise<boolean> {
  return updateAgendaItem(id, { concluido });
}

// ===================
// ROTINAS
// ===================

export async function getRotinas(userMatricula: number, activeOnly = false): Promise<Rotina[]> {
  let query = supabase
    .from('rotinas')
    .select('*')
    .eq('user_matricula', userMatricula)
    .order('hora', { ascending: true });

  if (activeOnly) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching rotinas:', error);
    return [];
  }

  return (data || []) as Rotina[];
}

export async function addRotina(rotina: {
  user_matricula: number;
  titulo: string;
  dias_semana: string[];
  hora: string;
  notificacao_minutos?: number;
}): Promise<Rotina | null> {
  const { data, error } = await supabase
    .from('rotinas')
    .insert({
      user_matricula: rotina.user_matricula,
      titulo: rotina.titulo,
      dias_semana: rotina.dias_semana,
      hora: rotina.hora,
      notificacao_minutos: rotina.notificacao_minutos ?? 15,
      ativo: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding rotina:', error);
    return null;
  }

  return data as Rotina;
}

export async function updateRotina(
  id: string,
  updates: Partial<Pick<Rotina, 'titulo' | 'dias_semana' | 'hora' | 'notificacao_minutos' | 'ativo'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('rotinas')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating rotina:', error);
    return false;
  }

  return true;
}

export async function deleteRotina(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('rotinas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting rotina:', error);
    return false;
  }

  return true;
}

export async function toggleRotinaActive(id: string, ativo: boolean): Promise<boolean> {
  return updateRotina(id, { ativo });
}

// ===================
// ROTINA COMPLETIONS
// ===================

export async function getRotinaCompletionsForDate(userMatricula: number, date: string): Promise<RotinaCompletion[]> {
  const { data, error } = await supabase
    .from('rotina_completions')
    .select('*')
    .eq('user_matricula', userMatricula)
    .eq('data_conclusao', date);

  if (error) {
    console.error('Error fetching rotina completions:', error);
    return [];
  }

  return (data || []) as RotinaCompletion[];
}

export async function markRotinaComplete(rotinaId: string, userMatricula: number, date: string): Promise<boolean> {
  const { error } = await supabase
    .from('rotina_completions')
    .insert({
      rotina_id: rotinaId,
      user_matricula: userMatricula,
      data_conclusao: date,
    });

  if (error) {
    // If it's a duplicate, that's okay
    if (error.code === '23505') {
      return true;
    }
    console.error('Error marking rotina complete:', error);
    return false;
  }

  return true;
}

export async function unmarkRotinaComplete(rotinaId: string, date: string): Promise<boolean> {
  const { error } = await supabase
    .from('rotina_completions')
    .delete()
    .eq('rotina_id', rotinaId)
    .eq('data_conclusao', date);

  if (error) {
    console.error('Error unmarking rotina complete:', error);
    return false;
  }

  return true;
}

// ===================
// HELPERS
// ===================

export function getTodayDayOfWeek(): string {
  const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  return days[new Date().getDay()];
}

export function getTodayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
}

export function getRotinasForToday(rotinas: Rotina[]): Rotina[] {
  const todayDow = getTodayDayOfWeek();
  return rotinas.filter(r => r.ativo && r.dias_semana.includes(todayDow));
}

export function isRotinaCompletedToday(rotinaId: string, completions: RotinaCompletion[]): boolean {
  return completions.some(c => c.rotina_id === rotinaId);
}

// Get upcoming items for notifications (within next X minutes)
export async function getUpcomingAgendaItems(userMatricula: number, withinMinutes: number = 15): Promise<AgendaItem[]> {
  const now = new Date();
  const today = getTodayDate();
  const currentTime = now.toTimeString().slice(0, 5);

  // Calculate time X minutes from now
  const futureTime = new Date(now.getTime() + withinMinutes * 60000);
  const futureTimeStr = futureTime.toTimeString().slice(0, 5);

  const { data, error } = await supabase
    .from('agenda_items')
    .select('*')
    .eq('user_matricula', userMatricula)
    .eq('data', today)
    .eq('concluido', false)
    .gte('hora', currentTime)
    .lte('hora', futureTimeStr);

  if (error) {
    console.error('Error fetching upcoming agenda items:', error);
    return [];
  }

  return (data || []) as AgendaItem[];
}

// Parse natural language for agenda/rotina
export interface ParsedAgendaCommand {
  tipo: 'lembrete' | 'rotina';
  titulo: string;
  data?: string;
  hora?: string;
  dias_semana?: string[];
}

export function parseTimeFromText(text: string): string | null {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Patterns for time extraction
  const patterns = [
    // "às 14 horas", "as 14h", "às 14:30"
    /(?:as|às)\s*(\d{1,2})(?::(\d{2}))?\s*(?:horas?|h)?/i,
    // "14 horas", "14h", "14:30"
    /(\d{1,2})(?::(\d{2}))?\s*(?:horas?|h)/i,
    // "duas da tarde", "três da manhã"
    /(\w+)\s+(?:da\s+)?(tarde|manha|noite)/i,
    // "meio dia", "meia noite"
    /meio[\s-]?dia/i,
    /meia[\s-]?noite/i,
  ];

  // Word to number mapping
  const wordToNumber: Record<string, number> = {
    'uma': 1, 'duas': 2, 'tres': 3, 'quatro': 4, 'cinco': 5,
    'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
    'onze': 11, 'doze': 12,
  };

  // Check meio dia / meia noite
  if (/meio[\s-]?dia/.test(normalized)) return '12:00';
  if (/meia[\s-]?noite/.test(normalized)) return '00:00';

  // Check patterns
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      let hours = 0;
      let minutes = '00';

      if (match[1] && /^\d+$/.test(match[1])) {
        hours = parseInt(match[1], 10);
        if (match[2]) minutes = match[2];
      } else if (match[1] && wordToNumber[match[1]]) {
        hours = wordToNumber[match[1]];
      }

      // Handle "da tarde", "da noite"
      if (match[2] === 'tarde' || match[2] === 'noite') {
        if (hours < 12) hours += 12;
      }

      if (hours >= 0 && hours <= 23) {
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
      }
    }
  }

  // Check for "cinco e meia", "sete e meia"
  const halfMatch = normalized.match(/(\w+)\s+e\s+meia/i);
  if (halfMatch && wordToNumber[halfMatch[1]]) {
    const hours = wordToNumber[halfMatch[1]];
    return `${hours.toString().padStart(2, '0')}:30`;
  }

  return null;
}

export function parseDaysFromText(text: string): string[] {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const days: string[] = [];

  // Check for ranges like "segunda a sexta"
  if (/segunda\s*(?:a|ate)\s*sexta/.test(normalized)) {
    return ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  }

  // Check for "todos os dias" or "todo dia"
  if (/todos?\s*(?:os)?\s*dias?/.test(normalized)) {
    return ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  }

  // Check individual days
  const dayPatterns: Record<string, string> = {
    'segunda': 'segunda',
    'terca': 'terca',
    'quarta': 'quarta',
    'quinta': 'quinta',
    'sexta': 'sexta',
    'sabado': 'sabado',
    'domingo': 'domingo',
  };

  for (const [pattern, day] of Object.entries(dayPatterns)) {
    if (normalized.includes(pattern)) {
      days.push(day);
    }
  }

  return days;
}

export function parseDateFromText(text: string): string | null {
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = new Date();

  // "hoje"
  if (/\bhoje\b/.test(normalized)) {
    return getTodayDate();
  }

  // "amanha"
  if (/\bamanha\b/.test(normalized)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatLocalDate(tomorrow);
  }

  // "depois de amanha"
  if (/depois\s*de\s*amanha/.test(normalized)) {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return formatLocalDate(dayAfter);
  }

  // Day of month pattern: "dia 15", "no dia 20"
  const dayMatch = normalized.match(/dia\s*(\d{1,2})/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const date = new Date(today.getFullYear(), today.getMonth(), day);
      // If the day has passed this month, use next month
      if (date < today) {
        date.setMonth(date.getMonth() + 1);
      }
      return formatLocalDate(date);
    }
  }

  // If no date found but has time, assume today
  if (parseTimeFromText(text)) {
    return getTodayDate();
  }

  return null;
}

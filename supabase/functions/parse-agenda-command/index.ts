import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedResult {
  tipo: 'lembrete' | 'rotina' | 'consulta';
  titulo?: string;
  data?: string;
  hora?: string;
  dias_semana?: string[];
  consulta_tipo?: 'hoje' | 'amanha' | 'semana';
}

// Word to number mapping for Portuguese
const wordToNumber: Record<string, number> = {
  'uma': 1, 'duas': 2, 'tres': 3, 'três': 3, 'quatro': 4, 'cinco': 5,
  'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
  'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14, 'catorze': 14,
  'quinze': 15, 'dezesseis': 16, 'dezessete': 17, 'dezoito': 18,
  'dezenove': 19, 'vinte': 20, 'vinte e uma': 21, 'vinte e duas': 22,
  'vinte e tres': 23, 'vinte e três': 23,
};

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseTimeFromText(text: string): string | null {
  const normalized = normalizeText(text);
  
  // Check meio dia / meia noite first
  if (/meio[\s-]?dia/.test(normalized)) return '12:00';
  if (/meia[\s-]?noite/.test(normalized)) return '00:00';

  // "cinco e meia", "sete e meia"
  const halfMatch = normalized.match(/(\w+)\s+e\s+meia(?:\s+(?:da\s+)?(manha|tarde|noite))?/i);
  if (halfMatch) {
    const wordNum = wordToNumber[halfMatch[1]];
    if (wordNum) {
      let hours = wordNum;
      // Handle period of day
      if (halfMatch[2] === 'tarde' || halfMatch[2] === 'noite') {
        if (hours < 12) hours += 12;
      }
      return `${hours.toString().padStart(2, '0')}:30`;
    }
  }

  // "às 14 horas", "as 14h", "às 14:30"
  const timePattern1 = normalized.match(/(?:as|às)\s*(\d{1,2})(?::(\d{2}))?\s*(?:horas?|h)?/i);
  if (timePattern1) {
    const hours = parseInt(timePattern1[1], 10);
    const minutes = timePattern1[2] || '00';
    if (hours >= 0 && hours <= 23) {
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
  }

  // "14 horas", "14h", "14:30"
  const timePattern2 = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(?:horas?|h)/i);
  if (timePattern2) {
    const hours = parseInt(timePattern2[1], 10);
    const minutes = timePattern2[2] || '00';
    if (hours >= 0 && hours <= 23) {
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
  }

  // "duas da tarde", "três da manhã", "oito da noite"
  const wordTimeMatch = normalized.match(/(\w+)\s+(?:da\s+)?(manha|tarde|noite)/i);
  if (wordTimeMatch && wordToNumber[wordTimeMatch[1]]) {
    let hours = wordToNumber[wordTimeMatch[1]];
    if (wordTimeMatch[2] === 'tarde' || wordTimeMatch[2] === 'noite') {
      if (hours < 12) hours += 12;
    }
    return `${hours.toString().padStart(2, '0')}:00`;
  }

  return null;
}

function parseDaysFromText(text: string): string[] {
  const normalized = normalizeText(text);
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
    'terça': 'terca',
    'quarta': 'quarta',
    'quinta': 'quinta',
    'sexta': 'sexta',
    'sabado': 'sabado',
    'sábado': 'sabado',
    'domingo': 'domingo',
  };

  for (const [pattern, day] of Object.entries(dayPatterns)) {
    if (normalized.includes(pattern) && !days.includes(day)) {
      days.push(day);
    }
  }

  return days;
}

// Compute a reference "today" date using the CLIENT timezone to avoid server UTC drift.
// client_tz_offset_minutes should match JS Date.getTimezoneOffset() (e.g. Brazil UTC-3 => 180).
function getReferenceDate(clientNowIso?: string, clientTzOffsetMinutes?: number): Date {
  try {
    const now = clientNowIso ? new Date(clientNowIso) : new Date();

    // Default to Brazil (UTC-3) when client doesn't send timezone
    const tzOffset = typeof clientTzOffsetMinutes === 'number' && !Number.isNaN(clientTzOffsetMinutes)
      ? clientTzOffsetMinutes
      : 180;

    // Convert "now" (UTC) to client-local time by subtracting the offset
    // local = utc - offset
    const localTimeMs = now.getTime() - (tzOffset * 60000);
    return new Date(localTimeMs);
  } catch {
    return new Date();
  }
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateFromText(text: string, ctx?: { clientNowIso?: string; clientTzOffsetMinutes?: number }): string | null {
  const normalized = normalizeText(text);
  const today = getReferenceDate(ctx?.clientNowIso, ctx?.clientTzOffsetMinutes);

  console.log('Reference local date:', today.toISOString(), 'formatted:', formatDateString(today), 'tz_offset:', ctx?.clientTzOffsetMinutes);

  // "hoje"
  if (/\bhoje\b/.test(normalized)) {
    return formatDateString(today);
  }

  // "amanha"
  if (/\bamanha\b/.test(normalized)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    console.log('Tomorrow calculated as:', formatDateString(tomorrow));
    return formatDateString(tomorrow);
  }

  // "depois de amanha"
  if (/depois\s*de\s*amanha/.test(normalized)) {
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return formatDateString(dayAfter);
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
      return formatDateString(date);
    }
  }

  return null;
}

function extractTitle(text: string): string {
  const normalized = normalizeText(text);
  
  // Remove common prefixes
  let cleaned = text
    .replace(/^(me\s+)?lembr[ae]\s+(de\s+)?/i, '')
    .replace(/^adiciona?\s+(na\s+)?(minha\s+)?rotina\s+/i, '')
    .replace(/^criar?\s+rotina\s+(diaria\s+)?/i, '')
    .replace(/^toda\s+(segunda|terca|quarta|quinta|sexta|sabado|domingo)(\s+(?:a|e|,)\s+(?:segunda|terca|quarta|quinta|sexta|sabado|domingo))*\s*/gi, '')
    .replace(/^de\s+segunda\s+a\s+sexta\s*/i, '')
    .replace(/^todos?\s+(?:os\s+)?dias?\s*/i, '')
    .trim();

  // Remove time expressions
  cleaned = cleaned
    .replace(/(?:as|às)\s*\d{1,2}(?::\d{2})?\s*(?:horas?|h)?/gi, '')
    .replace(/\d{1,2}(?::\d{2})?\s*(?:horas?|h)/gi, '')
    .replace(/(\w+)\s+e\s+meia(?:\s+(?:da\s+)?(manha|tarde|noite))?/gi, '')
    .replace(/(\w+)\s+(?:da\s+)?(manha|tarde|noite)/gi, '')
    .replace(/meio[\s-]?dia/gi, '')
    .replace(/meia[\s-]?noite/gi, '')
    .trim();

  // Remove date expressions
  cleaned = cleaned
    .replace(/\bhoje\b/gi, '')
    .replace(/\bamanha\b/gi, '')
    .replace(/depois\s*de\s*amanha/gi, '')
    .replace(/dia\s*\d{1,2}/gi, '')
    .trim();

  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned || 'Lembrete';
}

function isRotinaCommand(text: string): boolean {
  const normalized = normalizeText(text);
  
  // Explicit rotina keywords
  if (/rotina/.test(normalized)) return true;
  
  // Has multiple days specified
  const days = parseDaysFromText(text);
  if (days.length > 1) return true;
  
  // Has "segunda a sexta" or similar
  if (/segunda\s*(?:a|ate)\s*sexta/.test(normalized)) return true;
  if (/todos?\s*(?:os)?\s*dias?/.test(normalized)) return true;
  
  // Starts with day of week
  if (/^toda\s+(segunda|terca|quarta|quinta|sexta|sabado|domingo)/i.test(normalized)) return true;
  
  return false;
}

function isConsultaCommand(text: string): boolean {
  const normalized = normalizeText(text);
  
  const consultaPatterns = [
    /o\s+que\s+(?:eu\s+)?tenho\s+hoje/,
    /o\s+que\s+(?:eu\s+)?tenho\s+amanha/,
    /(?:minhas?\s+)?rotinas?\s+(?:de\s+)?hoje/,
    /(?:minhas?\s+)?rotinas?\s+(?:de\s+)?amanha/,
    /(?:meus?\s+)?lembretes?\s+(?:de\s+)?hoje/,
    /(?:meus?\s+)?lembretes?\s+(?:de\s+)?amanha/,
    /agenda\s+(?:de\s+)?hoje/,
    /agenda\s+(?:de\s+)?amanha/,
    /(?:me\s+)?mostr[ae]\s+(?:minhas?\s+)?rotinas?/,
    /(?:me\s+)?mostr[ae]\s+(?:meus?\s+)?lembretes?/,
    /(?:me\s+)?mostr[ae]\s+(?:minha\s+)?agenda/,
  ];

  return consultaPatterns.some(pattern => pattern.test(normalized));
}

function getConsultaTipo(text: string): 'hoje' | 'amanha' | 'semana' {
  const normalized = normalizeText(text);
  
  if (/amanha/.test(normalized)) return 'amanha';
  if (/semana/.test(normalized)) return 'semana';
  return 'hoje';
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const message = body?.message;
    const clientNowIso = body?.client_now_iso as string | undefined;
    const clientTzOffsetMinutes = body?.client_tz_offset_minutes as number | undefined;
    
    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsing command:', message);

    // Check if it's a consulta (query) command
    if (isConsultaCommand(message)) {
      const result: ParsedResult = {
        tipo: 'consulta',
        consulta_tipo: getConsultaTipo(message),
      };
      
      console.log('Parsed as consulta:', result);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract time
    const hora = parseTimeFromText(message);
    
    // Check if it's a rotina or lembrete
    if (isRotinaCommand(message)) {
      const dias_semana = parseDaysFromText(message);
      const titulo = extractTitle(message);
      
      const result: ParsedResult = {
        tipo: 'rotina',
        titulo,
        dias_semana: dias_semana.length > 0 ? dias_semana : ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
        hora: hora || '08:00',
      };
      
      console.log('Parsed as rotina:', result);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // It's a lembrete
    const data = parseDateFromText(message, { clientNowIso, clientTzOffsetMinutes }) || formatDateString(getReferenceDate(clientNowIso, clientTzOffsetMinutes));
    const titulo = extractTitle(message);
    
    const result: ParsedResult = {
      tipo: 'lembrete',
      titulo,
      data,
      hora: hora || '09:00',
    };
    
    console.log('Parsed as lembrete:', result);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing command:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to parse command' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

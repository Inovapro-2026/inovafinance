// ElevenLabs TTS Service for Brazilian Portuguese voice
// Uses the text-to-speech edge function

import { supabase } from '@/integrations/supabase/client';
import { playAudioExclusively, stopAllAudio, isGlobalAudioPlaying } from './audioManager';

/**
 * Format currency values for natural Brazilian Portuguese speech
 */
function formatCurrencyForSpeech(text: string): string {
  return text
    // Convert R$ 1.234,56 or R$1234.56 formats to spoken form
    .replace(/R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g, (_, value) => {
      const num = parseFloat(value.replace(/\./g, '').replace(',', '.'));
      return formatNumberAsCurrency(num);
    })
    // Convert decimal numbers with comma (Brazilian format) followed by "reais"
    .replace(/(\d{1,3}(?:\.\d{3})*),(\d{2})\s*reais/gi, (_, intPart, decPart) => {
      const num = parseFloat(intPart.replace(/\./g, '') + '.' + decPart);
      return formatNumberAsCurrency(num);
    })
    // Convert simple numbers followed by "reais" - e.g., "500 reais"
    .replace(/(\d+(?:\.\d{1,2})?)\s*reais/gi, (_, value) => {
      const num = parseFloat(value.replace(',', '.'));
      return formatNumberAsCurrency(num);
    })
    // Fix standalone currency amounts
    .replace(/R\$\s*(\d+(?:[.,]\d{1,2})?)/g, (_, value) => {
      const num = parseFloat(value.replace(',', '.'));
      return formatNumberAsCurrency(num);
    });
}

/**
 * Convert a number to spoken Brazilian Portuguese currency
 */
function formatNumberAsCurrency(value: number): string {
  if (isNaN(value)) return '';
  
  const intPart = Math.floor(value);
  const decPart = Math.round((value - intPart) * 100);
  
  let result = '';
  
  // Integer part
  if (intPart === 0 && decPart > 0) {
    // Only cents
  } else if (intPart === 1) {
    result = 'um real';
  } else {
    result = `${intPart} reais`;
  }
  
  // Decimal part (centavos)
  if (decPart > 0) {
    if (result) {
      result += ' e ';
    }
    if (decPart === 1) {
      result += 'um centavo';
    } else {
      result += `${decPart} centavos`;
    }
  }
  
  return result || 'zero reais';
}

/**
 * Clean text for TTS (remove emojis and formatting)
 */
function cleanTextForTts(text: string): string {
  // First format currency values for natural speech
  let cleanedText = formatCurrencyForSpeech(text);
  
  return cleanedText
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\*\*/g, '')
    .replace(/💸|💰|📊|📈|📉|📅|📌|🏆|😤|😒|🤡|😱|😭|🔥|💀|🎉|🙏|💪|💵|🚨|😐|💔|😩|🌪️|☕|🍕|🏥|🚲|🌉|😰|🎊|💳|🙄|👀|✍️|🤔|😅/g, '')
    .replace(/\n+/g, '. ')
    .trim();
}

/**
 * Speak text using ElevenLabs TTS
 */
export async function speakWithElevenLabs(text: string): Promise<void> {
  const cleanText = cleanTextForTts(text);
  
  if (!cleanText) {
    console.log('TTS: No text to speak after cleaning');
    return;
  }

  // Stop any current audio using global manager
  stopAllAudio();

  try {
    console.log('TTS: Requesting audio for:', cleanText.substring(0, 50) + '...');
    
    const { data, error } = await supabase.functions.invoke('text-to-speech', {
      body: { text: cleanText }
    });

    if (error) {
      console.error('TTS Error:', error);
      throw error;
    }

    if (!data?.audio) {
      throw new Error('No audio data received');
    }

    // Create audio element and play exclusively
    const audioUrl = `data:audio/mpeg;base64,${data.audio}`;
    const audio = new Audio(audioUrl);
    
    return playAudioExclusively(audio);
  } catch (error) {
    console.error('TTS Error:', error);
    throw error;
  }
}

/**
 * Stop any ongoing ElevenLabs speech
 */
export function stopElevenLabsSpeaking(): void {
  stopAllAudio();
}

/**
 * Check if currently speaking
 */
export function isElevenLabsSpeaking(): boolean {
  return isGlobalAudioPlaying();
}
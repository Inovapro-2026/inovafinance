// InovaFinance TTS Service for Brazilian Portuguese voice
// Uses the custom TTS API via edge function

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
 * Speak text using InovaFinance TTS with fallback to native TTS
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
      // Fallback to native TTS
      return speakWithNativeTts(cleanText);
    }

    if (!data?.audio_url) {
      // Check for API errors
      if (data?.error) {
        console.warn('TTS API error, using native TTS:', data.error);
        return speakWithNativeTts(cleanText);
      }
      throw new Error('No audio URL received');
    }

    // Create audio element and play exclusively from URL
    const audio = new Audio(data.audio_url);
    
    return playAudioExclusively(audio);
  } catch (error) {
    console.error('TTS Error, falling back to native:', error);
    // Fallback to native browser TTS
    return speakWithNativeTts(cleanText);
  }
}

/**
 * Fallback native browser TTS for Brazilian Portuguese
 */
function speakWithNativeTts(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      console.error('Native TTS not supported');
      resolve();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to find a Brazilian Portuguese voice
    const voices = window.speechSynthesis.getVoices();
    const ptBrVoice = voices.find(v => v.lang === 'pt-BR') || 
                      voices.find(v => v.lang.startsWith('pt')) ||
                      voices[0];
    
    if (ptBrVoice) {
      utterance.voice = ptBrVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      console.error('Native TTS error:', e);
      resolve(); // Resolve anyway to not block
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any ongoing ElevenLabs speech
 */
export function stopElevenLabsSpeaking(): void {
  stopAllAudio();
  // Also stop native TTS if running
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check if currently speaking
 */
export function isElevenLabsSpeaking(): boolean {
  return isGlobalAudioPlaying() || (window.speechSynthesis?.speaking ?? false);
}
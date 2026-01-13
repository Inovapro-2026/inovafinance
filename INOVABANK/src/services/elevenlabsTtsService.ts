// ElevenLabs TTS Service for Brazilian Portuguese voice
// Uses the text-to-speech edge function

import { supabase } from '@/integrations/supabase/client';
import { playAudioExclusively, stopAllAudio, isGlobalAudioPlaying } from './audioManager';

/**
 * Clean text for TTS (remove emojis and formatting)
 */
function cleanTextForTts(text: string): string {
  return text
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
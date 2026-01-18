import { supabase } from '@/integrations/supabase/client';
import { playAudioExclusively, stopAllAudio, isGlobalAudioPlaying, speakTextExclusively } from './audioManager';

// Cache for audio to avoid repeated API calls
const audioCache = new Map<string, string>();

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface TTSResult {
  audio: HTMLAudioElement | null;
  error: string | null;
}

async function playAudioOrFallback(audio: HTMLAudioElement, fallbackText: string) {
  try {
    await playAudioExclusively(audio);
  } catch (err: any) {
    console.error('TTS playback error:', err);

    // Common on mobile/Safari/Chrome if play() happens after async work
    if (err?.name === 'NotAllowedError' || String(err).includes('NotAllowedError')) {
      console.warn('TTS: Autoplay blocked; using native SpeechSynthesis fallback');
      speakTextExclusively(fallbackText, { lang: 'pt-BR' });
      return;
    }

    throw err;
  }
}

/**
 * Text-to-Speech service using ElevenLabs TTS API via Edge Function
 * Converts text to audio and plays it
 */
export async function speak(text: string): Promise<HTMLAudioElement | null> {
  if (!text || text.trim() === '') {
    console.warn('TTS: Empty text provided');
    return null;
  }

  // Normalize text for caching
  const cacheKey = text.trim().toLowerCase();

  // Check cache first
  if (audioCache.has(cacheKey)) {
    console.log('TTS: Using cached audio');
    const cachedAudioUrl = audioCache.get(cacheKey)!;
    const audio = new Audio(cachedAudioUrl);
    await playAudioOrFallback(audio, text);
    return audio;
  }

  try {
    console.log('TTS: Requesting speech from ElevenLabs for:', text.substring(0, 50));

    // Use ElevenLabs TTS instead of Gemini (which has quota limits)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ text: text.trim() }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('TTS: ElevenLabs error:', errorText);
      // Fallback to native TTS
      console.log('TTS: Falling back to native speech synthesis');
      speakTextExclusively(text, { lang: 'pt-BR' });
      return null;
    }

    // Get audio as blob
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Cache the audio URL
    audioCache.set(cacheKey, audioUrl);

    const audio = new Audio(audioUrl);
    
    // Clean up URL when audio ends
    audio.onended = () => {
      // Keep in cache, don't revoke
    };

    await playAudioOrFallback(audio, text);

    console.log('TTS: ElevenLabs audio played successfully');
    return audio;
  } catch (err) {
    console.error('TTS: Service error:', err);
    // Fallback to native TTS on any error
    console.log('TTS: Falling back to native speech synthesis');
    speakTextExclusively(text, { lang: 'pt-BR' });
    return null;
  }
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  stopAllAudio();
}

/**
 * Check if currently speaking
 */
export function isSpeaking(): boolean {
  return isGlobalAudioPlaying();
}

/**
 * Preload audio for common phrases
 */
export async function preloadCommonPhrases(phrases: string[]): Promise<void> {
  for (const phrase of phrases) {
    const cacheKey = phrase.trim().toLowerCase();
    if (!audioCache.has(cacheKey)) {
      try {
        const { data } = await supabase.functions.invoke('text-to-speech', {
          body: { text: phrase }
        });
        if (data?.audio) {
          const audioUrl = `data:${data.contentType || 'audio/wav'};base64,${data.audio}`;
          audioCache.set(cacheKey, audioUrl);
        }
      } catch (err) {
        console.error('TTS preload error:', err);
      }
    }
  }
}

/**
 * Clear the audio cache
 */
export function clearCache(): void {
  audioCache.clear();
}

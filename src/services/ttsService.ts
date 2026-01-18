import { supabase } from '@/integrations/supabase/client';
import { playAudioExclusively, stopAllAudio, isGlobalAudioPlaying, speakTextExclusively } from './audioManager';

// Cache for audio to avoid repeated API calls
const audioCache = new Map<string, string>();

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
 * Text-to-Speech service using InovaFinance TTS API via Edge Function
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
    console.log('TTS: Requesting speech for:', text.substring(0, 50));

    const { data, error } = await supabase.functions.invoke('text-to-speech', {
      body: { text: text.trim() },
    });

    if (error) {
      console.error('TTS: Edge function error:', error);
      return null;
    }

    if (data?.error) {
      console.error('TTS: API error:', data.error);
      return null;
    }

    // New API returns a public audio_url; old implementation returned base64.
    const audioUrl: string | null =
      typeof data?.audio_url === 'string'
        ? data.audio_url
        : data?.audio
          ? `data:${data.contentType || 'audio/wav'};base64,${data.audio}`
          : null;

    if (!audioUrl) {
      console.error('TTS: No audio URL/data received:', data);
      return null;
    }

    // Cache the audio URL
    audioCache.set(cacheKey, audioUrl);

    const audio = new Audio(audioUrl);
    await playAudioOrFallback(audio, text);

    console.log('TTS: Audio played successfully');
    return audio;
  } catch (err) {
    console.error('TTS: Service error:', err);
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

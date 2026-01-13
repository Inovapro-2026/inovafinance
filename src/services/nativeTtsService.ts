// Native TTS Service with Global Audio Control
// Uses browser's native speech synthesis with exclusive control

import { stopAllAudio } from './audioManager';

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
 * Stop any ongoing native speech
 */
export function stopNativeSpeaking(): void {
  stopAllAudio();
}

/**
 * Speak text using native browser speech synthesis with exclusive control
 */
export function speakNative(text: string): void {
  if (!('speechSynthesis' in window)) {
    console.warn('Native TTS: Speech synthesis not supported');
    return;
  }

  const cleanText = cleanTextForTts(text);
  if (!cleanText) {
    console.log('Native TTS: No text to speak after cleaning');
    return;
  }

  // Stop any current audio before starting new speech
  stopAllAudio();

  // Cancel any ongoing speech and start fresh
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Select best Portuguese voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoices = [
    'Microsoft Daniel',
    'Google português do Brasil',
    'Daniel',
    'Luciana'
  ];

  for (const preferred of preferredVoices) {
    const voice = voices.find(v => 
      v.name.includes(preferred) && (v.lang === 'pt-BR' || v.lang.startsWith('pt'))
    );
    if (voice) {
      utterance.voice = voice;
      break;
    }
  }

  utterance.onstart = () => {
    console.log('Native TTS: Started speaking');
  };

  utterance.onend = () => {
    console.log('Native TTS: Finished speaking');
  };

  utterance.onerror = (e) => {
    console.error('Native TTS: Error', e);
  };

  window.speechSynthesis.speak(utterance);
  console.log('Native TTS: Speaking text:', cleanText.substring(0, 50) + '...');
}
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_ID = "cgSgspJ2msm6clMCkdW9"; // Vitoria - Brazilian Female

import { stopAllAudio, playAudioExclusively, isGlobalAudioPlaying } from './audioManager';

/**
 * Clean text for TTS (remove emojis and formatting)
 */
function cleanTextForTts(text: string): string {
    return text
        .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
        .replace(/\*\*/g, '')
        .replace(/💸|💰|📊|📈|📉|📅|📌|🏆|😤|😒|🤡|😱|😭|🔥|💀|🎉|🙏|💪|💵|🚨|😐|💔|😩|🌪️|☕|🍕|🏥|🚲|Bridge|😰|🎊|💳|🙄|👀|✍️|🤔|😅/g, '')
        .replace(/\n+/g, '. ')
        .trim();
}

/**
 * Fallback to browser's native speech synthesis
 */
function speakWithNative(text: string): void {
    console.log("TTS: Falling back to native speech synthesis");
    
    // Stop any ongoing audio before native speech
    stopAllAudio();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

/**
 * Stop any ongoing speech
 */
export function stopGeminiSpeaking(): void {
    stopAllAudio();
}

/**
 * Check if currently speaking
 */
export function isGeminiSpeaking(): boolean {
    return isGlobalAudioPlaying();
}

/**
 * Generate and play speech using ElevenLabs TTS with Native Fallback
 */
export async function speakWithGemini(text: string): Promise<void> {
    const cleanText = cleanTextForTts(text);
    if (!cleanText) return;

    // Stop any current audio
    stopAllAudio();

    if (!ELEVENLABS_API_KEY) {
        console.warn("TTS: ElevenLabs API Key missing in browser, using native fallback");
        speakWithNative(cleanText);
        return;
    }

    try {
        console.log("TTS: Requesting ElevenLabs (Vitoria) for:", cleanText.substring(0, 50) + "...");

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
                text: cleanText,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75
                }
            })
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs failed: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Play exclusively using global manager
        await playAudioExclusively(audio, () => {
            URL.revokeObjectURL(audioUrl);
        }, (err) => {
            console.error("TTS Playback error:", err);
            URL.revokeObjectURL(audioUrl);
            speakWithNative(cleanText);
        });

    } catch (error) {
        console.error("TTS: ElevenLabs exception", error);
        speakWithNative(cleanText);
    }
}

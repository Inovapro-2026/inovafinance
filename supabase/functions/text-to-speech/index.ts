import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Gemini TTS API endpoint
const GEMINI_TTS_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-native-audio-dialog:generateContent";

// Convert raw PCM (L16) to WAV format
function pcmToWav(pcmBase64: string, sampleRate: number = 24000, channels: number = 1, bitsPerSample: number = 16): string {
  const pcmBytes = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmBytes.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  // RIFF header
  view.setUint8(0, 'R'.charCodeAt(0));
  view.setUint8(1, 'I'.charCodeAt(0));
  view.setUint8(2, 'F'.charCodeAt(0));
  view.setUint8(3, 'F'.charCodeAt(0));
  view.setUint32(4, fileSize - 8, true); // File size - 8
  view.setUint8(8, 'W'.charCodeAt(0));
  view.setUint8(9, 'A'.charCodeAt(0));
  view.setUint8(10, 'V'.charCodeAt(0));
  view.setUint8(11, 'E'.charCodeAt(0));
  
  // fmt chunk
  view.setUint8(12, 'f'.charCodeAt(0));
  view.setUint8(13, 'm'.charCodeAt(0));
  view.setUint8(14, 't'.charCodeAt(0));
  view.setUint8(15, ' '.charCodeAt(0));
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data chunk
  view.setUint8(36, 'd'.charCodeAt(0));
  view.setUint8(37, 'a'.charCodeAt(0));
  view.setUint8(38, 't'.charCodeAt(0));
  view.setUint8(39, 'a'.charCodeAt(0));
  view.setUint32(40, dataSize, true);
  
  // Copy PCM data
  const wavBytes = new Uint8Array(buffer);
  wavBytes.set(pcmBytes, headerSize);
  
  // Convert to base64
  let binary = '';
  for (let i = 0; i < wavBytes.length; i++) {
    binary += String.fromCharCode(wavBytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || text.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TTS API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean text - remove emojis and special formatting
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      .replace(/\*\*/g, '')
      .replace(/💸|💰|📊|📈|📉|📅|📌|🏆|😤|😒|🤡|😱|😭|🔥|💀|🎉|🙏|💪|💵|🚨|😐|💔|😩|🌪️|☕|🍕|🏥|🚲|🌉|😰|🎊|💳|🙄|👀|✍️|🤔|😅/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) {
      return new Response(
        JSON.stringify({ error: 'No valid text after cleaning' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gemini TTS Request for text:', cleanText.substring(0, 100) + '...');

    // Call Gemini TTS API
    const response = await fetch(`${GEMINI_TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: cleanText }]
        }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // Natural female voice
              }
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini TTS API error:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate speech', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Extract audio from Gemini response
    const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (!audioData?.data) {
      console.error('No audio data in Gemini response:', JSON.stringify(data, null, 2));
      return new Response(
        JSON.stringify({ error: 'No audio received from TTS API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Gemini TTS Success - audio generated, mimeType:', audioData.mimeType);

    // Gemini returns audio/L16 (raw PCM) - convert to WAV for browser compatibility
    let audioBase64 = audioData.data;
    let contentType = audioData.mimeType || 'audio/wav';
    
    // If it's L16/PCM format, convert to WAV
    if (contentType.includes('audio/L16') || contentType.includes('audio/pcm')) {
      // Parse sample rate from mimeType if present (e.g., "audio/L16;rate=24000")
      const rateMatch = contentType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 24000;
      
      console.log('Converting PCM to WAV, sample rate:', sampleRate);
      audioBase64 = pcmToWav(audioData.data, sampleRate);
      contentType = 'audio/wav';
    }

    // Return base64 audio
    return new Response(
      JSON.stringify({ 
        audio: audioBase64, 
        contentType: contentType
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('TTS Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

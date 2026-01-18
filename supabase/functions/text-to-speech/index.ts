import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// InovaFinance TTS API endpoint
const TTS_API_URL = "http://148.230.76.60:8020/tts";

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

    // Get API key from environment (configured via secrets)
    const apiKey = Deno.env.get('INOVAFINANCE_TTS_API_KEY');
    
    if (!apiKey) {
      console.error('INOVAFINANCE_TTS_API_KEY not configured');
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

    console.log('TTS Request for text:', cleanText.substring(0, 100) + '...');

    // Call InovaFinance TTS API
    const response = await fetch(TTS_API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: cleanText }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('InovaFinance TTS API error:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ error: 'Failed to generate speech', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.audio_url) {
      console.error('No audio_url in response:', data);
      return new Response(
        JSON.stringify({ error: 'No audio URL received from TTS API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('TTS Success - audio URL:', data.audio_url);

    // Return the audio URL for the client to play directly
    return new Response(
      JSON.stringify({ audio_url: data.audio_url }),
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

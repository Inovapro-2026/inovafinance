import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prefer a dedicated Google Cloud TTS key if present. Fallback to GEMINI_API_KEY if user reused it.
const GOOGLE_TTS_API_KEY = Deno.env.get("GOOGLE_TTS_API_KEY") ?? Deno.env.get("INOVAFINANCE_TTS_API_KEY");
const FALLBACK_API_KEY = Deno.env.get("GEMINI_API_KEY");

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json().catch(() => ({ text: "" }));

    if (!text || typeof text !== "string") {
      return json(400, { error: "Text is required" });
    }

    const apiKey = GOOGLE_TTS_API_KEY ?? FALLBACK_API_KEY;
    if (!apiKey) {
      console.error("No Google TTS API key configured (GOOGLE_TTS_API_KEY / INOVAFINANCE_TTS_API_KEY / GEMINI_API_KEY)");
      // Return 204 so the client can silently fallback to native voice without triggering runtime errors
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    console.log("Gemini/Google TTS request for:", text.substring(0, 80));

    // Clean text for TTS
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "")
      .replace(/\*\*/g, "")
      .replace(/\n+/g, ". ")
      .trim();

    const ttsResponse = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: cleanText },
          voice: {
            languageCode: "pt-BR",
            name: "pt-BR-Wavenet-A",
            ssmlGender: "FEMALE",
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0,
          },
        }),
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error("Google TTS API error:", errorText);
      // Do NOT return 500 (it surfaces as a runtime error). Return 204 so the client falls back to native TTS.
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const ttsData = await ttsResponse.json();
    if (!ttsData?.audioContent) {
      console.error("Google TTS: missing audioContent");
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Decode base64 audio and return as binary
    const audioBytes = Uint8Array.from(atob(ttsData.audioContent), (c) => c.charCodeAt(0));

    return new Response(audioBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("gemini-tts unexpected error:", error);
    // Silent fallback
    return new Response(null, { status: 204, headers: corsHeaders });
  }
});

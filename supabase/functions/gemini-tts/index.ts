import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json().catch(() => ({ text: "" }));

    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    console.log("Gemini 2.5 Flash TTS request for:", text.substring(0, 80));

    // Clean text for TTS
    const cleanText = text
      .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, "")
      .replace(/\*\*/g, "")
      .replace(/\n+/g, ". ")
      .trim();

    // Use Gemini 2.5 Flash Preview TTS model
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: cleanText }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Kore"
                }
              }
            }
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini TTS API error:", geminiResponse.status, errorText);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const geminiData = await geminiResponse.json();
    
    // Extract audio from Gemini response
    const audioData = geminiData?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (!audioData?.data) {
      console.error("Gemini TTS: no audio data in response", JSON.stringify(geminiData).substring(0, 500));
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Decode base64 audio
    const audioBytes = Uint8Array.from(atob(audioData.data), (c) => c.charCodeAt(0));
    const mimeType = audioData.mimeType || "audio/mp3";

    console.log("Gemini TTS success, audio size:", audioBytes.length, "type:", mimeType);

    return new Response(audioBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": mimeType,
      },
    });
  } catch (error) {
    console.error("gemini-tts unexpected error:", error);
    return new Response(null, { status: 204, headers: corsHeaders });
  }
});

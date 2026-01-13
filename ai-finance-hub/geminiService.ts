import { GoogleGenAI, Type, Modality, FunctionDeclaration } from "@google/genai";

export interface AIProcessedResult {
  type: 'ganho' | 'gasto';
  amount: number;
  category: string;
  description: string;
}

const tools: { functionDeclarations: FunctionDeclaration[] } = {
  functionDeclarations: [
    {
      name: "record_transaction",
      description: "Registra uma nova transação financeira (ganho ou gasto).",
      parameters: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["ganho", "gasto"], description: "O tipo da transação." },
          amount: { type: Type.NUMBER, description: "O valor monetário." },
          category: { type: Type.STRING, description: "Categoria (Mercado, Lazer, etc)." },
          description: { type: Type.STRING, description: "Breve descrição." }
        },
        required: ["type", "amount", "category", "description"]
      }
    },
    {
      name: "get_financial_summary",
      description: "Consulta o total de gastos ou ganhos de um período.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["ganho", "gasto", "ambos"], description: "Tipo de dado." },
          period: { type: Type.STRING, enum: ["hoje", "mes"], description: "Período." }
        },
        required: ["type", "period"]
      }
    },
    {
      name: "get_current_balance",
      description: "Consulta o saldo atual total do usuário (considerando saldo inicial e transações).",
      parameters: { type: Type.OBJECT, properties: {} }
    },
    {
      name: "get_goals_info",
      description: "Consulta informações sobre metas.",
      parameters: { type: Type.OBJECT, properties: {} }
    }
  ]
};

const SYSTEM_INSTRUCTION = `
Você é a inteligência central do INOVAFINANCE. Sua personalidade é:
- Rígida com piadas, mas nunca grosseira.
- Engraçada de forma leve e inteligente, humor sutil.
- Educada, tecnológica e confiante. Linguagem moderna.
- Direta, mas com charme.
- Se o usuário rir (kkk, haha), responda algo como: "O riso foi anotado, mas o saldo ainda é sério" ou "Humor detectado. Finanças carregando...".
- Se não houver dados ou saldo for 0, diga: "Saldo atual: R$0,00. Nada registrado ainda, mas estou pronta." ou "Nenhum gasto registrado. É tranquilo… por enquanto."
- Nunca invente números. Use os dados retornados pelas ferramentas.
- Foco total em clareza financeira.
`;

// Fix: Moving GoogleGenAI instantiation inside function calls as per best practices 
// to ensure it always uses the most up-to-date environment variables and configuration.
export const processAIRequest = async (text: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: text,
      config: {
        tools: [tools],
        systemInstruction: SYSTEM_INSTRUCTION
      },
    });
    return response;
  } catch (error) {
    console.error("AI Request Error:", error);
    return null;
  }
};

// Fix: Instantiating GoogleGenAI inside the function. Ensuring tool response 
// is linked to the function call via callId for modern Gemini models.
export const generateFinalResponse = async (userPrompt: string, functionName: string, functionResult: any, callId: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { role: "user", parts: [{ text: userPrompt }] },
        { 
          role: "tool", 
          parts: [{ 
            functionResponse: {
              name: functionName,
              response: { result: functionResult },
              id: callId
            } 
          }] 
        }
      ],
      config: {
        tools: [tools],
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Response Error:", error);
    return "Tive um problema ao processar sua consulta. Pode repetir?";
  }
}

// Fix: Ensuring GoogleGenAI is instantiated at call-time.
export const generateSpeech = async (text: string): Promise<string | null> => {
  if (!navigator.onLine) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data || null;
  } catch (error) {
    return null;
  }
};
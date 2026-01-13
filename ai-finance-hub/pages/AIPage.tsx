
import React, { useState, useRef, useEffect } from 'react';
import { processAIRequest, generateSpeech, generateFinalResponse, AIProcessedResult } from '../geminiService';
import { db } from '../db';

const AIPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [isListening, setIsListening] = useState(false);
  const [showMicAnim, setShowMicAnim] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aiTextResponse, setAiTextResponse] = useState<string>('');
  
  const [showModal, setShowModal] = useState(false);
  const [pendingTx, setPendingTx] = useState<AIProcessedResult | null>(null);
  const [manualValue, setManualValue] = useState('');

  const recognitionRef = useRef<any>(null);
  const transcriptAcc = useRef('');
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTTS = async (text: string) => {
    try {
      const base64Audio = await generateSpeech(text);
      if (!base64Audio) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const audioData = atob(base64Audio);
      const view = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) view[i] = audioData.charCodeAt(i);
      const dataInt16 = new Int16Array(view.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      buffer.getChannelData(0).set(Array.from(dataInt16).map(v => v / 32768.0));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {}
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) transcriptAcc.current += ' ' + event.results[i][0].transcript;
        }
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const handleProcessInput = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setAiTextResponse('');

    try {
      const response = await processAIRequest(text);
      const call = response?.functionCalls?.[0];

      if (call) {
        let resultData: any = 0;
        if (call.name === 'record_transaction') {
          setPendingTx(call.args as any);
          setShowModal(true);
          setIsProcessing(false);
          return;
        }
        if (call.name === 'get_current_balance') {
          const profile = await db.profiles.get(userId);
          const txs = await db.transactions.where('userId').equals(userId).toArray();
          const initial = profile?.initialBalance || 0;
          const gains = txs.filter(t => t.type === 'ganho').reduce((acc, t) => acc + t.amount, 0);
          const loss = txs.filter(t => t.type === 'gasto').reduce((acc, t) => acc + t.amount, 0);
          resultData = { balance: initial + gains - loss };
        }
        if (call.name === 'get_financial_summary') {
          const { type, period } = call.args as any;
          const start = new Date();
          if (period === 'hoje') start.setHours(0,0,0,0);
          else start.setDate(1);
          const txs = await db.transactions.where('userId').equals(userId).toArray();
          const filtered = txs.filter(t => new Date(t.date) >= start && (type === 'ambos' || t.type === type));
          resultData = { total: filtered.reduce((acc, t) => acc + t.amount, 0), period, type };
        }
        if (call.name === 'get_goals_info') {
          const goals = await db.goals.where('userId').equals(userId).toArray();
          resultData = goals.map(g => ({ title: g.title, progress: (g.currentAmount/g.targetAmount)*100 }));
        }
        const finalMsg = await generateFinalResponse(text, call.name, resultData, call.id);
        setAiTextResponse(finalMsg || "Comando executado.");
        playTTS(finalMsg || "Comando executado.");
      } else {
        const fallback = response?.text || "Detectei sua voz, mas não compreendi o comando financeiro.";
        setAiTextResponse(fallback);
        playTTS(fallback);
      }
    } catch (err) {
      setAiTextResponse("Falha tecnológica na nuvem. Tente novamente em instantes.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startMic = () => {
    setIsListening(true);
    transcriptAcc.current = '';
    recognitionRef.current.start();
  };

  const stopMic = () => {
    setIsListening(false);
    recognitionRef.current.stop();
    handleProcessInput(transcriptAcc.current);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleProcessInput(manualValue);
    setManualValue('');
  };

  const confirmAndSave = async () => {
    if (!pendingTx) return;
    setIsSaving(true);
    try {
      await db.transactions.add({ ...pendingTx, userId, date: new Date().toISOString() });
      const msg = "Transação processada com sucesso. Seu saldo foi atualizado.";
      setAiTextResponse(msg);
      playTTS(msg);
      setShowModal(false);
      setPendingTx(null);
    } catch (err) {
      alert("Erro ao persistir dados.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div className="max-w-md w-full text-center mb-12 animate-fadeIn">
        <div className="flex items-center justify-center gap-2 text-[#7A5CFA] font-black uppercase text-[10px] tracking-[0.3em] mb-4">
           <i className="fas fa-microchip"></i>
           Assitente Inova Voice
        </div>
        {aiTextResponse ? (
          <div className="bg-white/40 backdrop-blur-xl p-6 rounded-[32px] border border-white shadow-xl">
             <p className="text-gray-800 font-bold italic leading-relaxed">"{aiTextResponse}"</p>
          </div>
        ) : (
          <p className="text-gray-400 font-medium px-8">Toque no microfone e diga algo como: "Gastei 50 reais em mercado hoje"</p>
        )}
      </div>

      <div className="relative flex items-center justify-center">
        {isListening && (
          <>
            <div className="mic-waves"></div>
            <div className="mic-waves"></div>
            <div className="mic-waves"></div>
          </>
        )}
        
        <button 
          onClick={isListening ? stopMic : startMic}
          disabled={isProcessing}
          className={`w-48 h-48 rounded-full flex flex-col items-center justify-center gap-2 text-white shadow-2xl transition-all duration-500 press-bounce relative z-10
            ${isListening ? 'bg-red-500 scale-110' : 'bg-gradient-to-br from-[#7A5CFA] to-[#4A90FF]'}
            ${isProcessing ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-105'}
          `}
        >
          <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'} text-5xl`}></i>
          <span className="text-[10px] font-black uppercase tracking-widest">{isListening ? 'Parar' : 'Falar'}</span>
        </button>
      </div>

      <form onSubmit={handleManualSubmit} className="mt-16 w-full max-w-sm">
        <div className="relative group">
          <input 
            type="text"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="Ou digite seu comando aqui..."
            className="w-full bg-white/60 backdrop-blur-md border-2 border-transparent focus:border-[#7A5CFA] rounded-3xl px-8 py-5 text-gray-800 font-bold outline-none transition-all shadow-sm"
          />
          <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A5CFA] hover:scale-110 active:scale-90 transition-transform">
             <i className="fas fa-paper-plane text-xl"></i>
          </button>
        </div>
      </form>

      {showModal && pendingTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm glass-modal rounded-[40px] p-8 shadow-2xl border border-white/40">
            <div className="flex flex-col items-center mb-8">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white text-3xl mb-4 shadow-lg ${pendingTx.type === 'ganho' ? 'bg-[#4A90FF]' : 'bg-[#FF8C42]'}`}>
                <i className={`fas ${pendingTx.type === 'ganho' ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i>
              </div>
              <h3 className="text-2xl font-black text-gray-800">Conferência</h3>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Processado via Voz</p>
            </div>

            <div className="space-y-4 mb-10">
              <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-gray-400 uppercase">Valor</span>
                <span className="text-2xl font-black text-gray-800">R$ {pendingTx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl">
                <span className="text-[10px] font-black text-gray-400 uppercase">Categoria</span>
                <span className="font-black text-[#7A5CFA]">{pendingTx.category}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowModal(false)} className="flex-1 py-4 rounded-2xl font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-colors">DESCARTAR</button>
              <button onClick={confirmAndSave} disabled={isSaving} className="flex-[2] py-4 bg-[#4A90FF] text-white rounded-2xl font-black shadow-lg shadow-[#4A90FF]/20 flex items-center justify-center gap-2">
                {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIPage;

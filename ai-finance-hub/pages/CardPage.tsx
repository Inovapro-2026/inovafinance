
import React, { useState, useEffect } from 'react';
import { db } from '../db';

const CardPage: React.FC<{ userId: string }> = ({ userId }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardData, setCardData] = useState({
    name: '',
    number: '',
    validity: '',
    cvv: '',
    balance: 0
  });

  useEffect(() => {
    const generateNumber = () => {
      let num = "";
      for (let i = 0; i < 4; i++) {
        num += Math.floor(1000 + Math.random() * 9000) + (i < 3 ? " " : "");
      }
      return num;
    };

    const generateValidity = () => {
      const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
      const year = String(new Date().getFullYear() + 5).slice(-2);
      return `${month}/${year}`;
    };

    const loadData = async () => {
        const profile = await db.profiles.get(userId);
        const displayName = profile?.fullName?.toUpperCase() || `USER ${userId}`;

        const txs = await db.transactions.where('userId').equals(userId).toArray();
        const current = (profile?.initialBalance || 0) + 
                        txs.filter(t => t.type === 'ganho').reduce((acc, t) => acc + t.amount, 0) -
                        txs.filter(t => t.type === 'gasto').reduce((acc, t) => acc + t.amount, 0);
        
        setCardData({
            name: displayName,
            number: generateNumber(),
            validity: generateValidity(),
            cvv: String(Math.floor(100 + Math.random() * 900)),
            balance: current
        });
    };

    loadData();
  }, [userId]);

  return (
    <div className="h-full flex flex-col items-center justify-center py-6 md:py-10 animate-fadeIn overflow-hidden">
      <div className="text-center mb-10 flex-shrink-0">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-4">
          <div className="w-2 h-2 bg-[#7A5CFA] rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status: Cartão Ativo</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase">
          INOVAFINANCE <span className="text-[#7A5CFA] drop-shadow-[0_0_15px_rgba(122,90,250,0.5)]">BLACK</span>
        </h2>
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Toque para revelar o verso</p>
      </div>

      <div 
        className="relative w-full max-w-[380px] aspect-[1.58/1] cursor-pointer perspective-container flex-shrink-0"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`card-inner ${isFlipped ? 'card-flip' : ''}`}>
          
          {/* FRENTE DO CARTÃO */}
          <div className="card-face card-front bg-gradient-to-br from-[#1a1c2c] via-[#0a0f1d] to-[#000000] p-6 md:p-8 justify-between shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] border border-white/10 animate-shine">
            <div className="flex justify-between items-start relative z-10">
              <div className="flex flex-col">
                <span className="text-white text-base md:text-lg font-black tracking-tighter">INOVAFINANCE <span className="text-[#7A5CFA]">BANK</span></span>
                <div className="w-8 h-1 mt-1 bg-[#7A5CFA] rounded-full"></div>
              </div>
              <div className="w-12 h-9 bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-800 rounded-md flex items-center justify-center overflow-hidden shadow-inner relative">
                 <div className="w-full h-full opacity-30 carbon-texture"></div>
                 <div className="absolute inset-0 grid grid-cols-2 gap-px p-1">
                    <div className="border border-black/10"></div>
                    <div className="border border-black/10"></div>
                    <div className="border border-black/10"></div>
                    <div className="border border-black/10"></div>
                 </div>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="text-white text-xl md:text-2xl font-bold tracking-[0.18em] font-mono drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {cardData.number || '•••• •••• •••• ••••'}
              </div>

              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Titular</span>
                  <span className="text-white text-xs md:text-sm font-bold tracking-wider truncate max-w-[180px] uppercase drop-shadow-sm">{cardData.name || 'CLIENTE PREMIUM'}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Exp</span>
                  <span className="text-white text-xs md:text-sm font-bold tracking-widest">{cardData.validity || '00/00'}</span>
                </div>
              </div>
            </div>
            
            <div className="absolute inset-0 carbon-texture opacity-[0.05] pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-[#7A5CFA]/5 to-transparent pointer-events-none"></div>
          </div>

          {/* VERSO DO CARTÃO */}
          <div className="card-face card-back bg-gradient-to-br from-[#0a0f1d] to-[#1a1c2c] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.9)] border border-white/5">
            <div className="w-full h-12 bg-[#000000]/95 mt-6 md:mt-8"></div>
            
            <div className="px-6 md:px-8 pt-4 md:pt-6 flex-1 flex flex-col justify-between pb-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-10 bg-white/5 rounded flex items-center justify-end px-4 text-white/40 font-mono text-xs tracking-[0.3em] border border-white/5">
                    CVV {cardData.cvv}
                  </div>
                  <div className="w-12 h-10 flex items-center justify-center opacity-60">
                      <i className="fab fa-mastercard text-white text-4xl"></i>
                  </div>
                </div>

                <div className="pt-2">
                   <div className="flex flex-col mb-4">
                      <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">Saldo Protegido</span>
                      <span className={`text-xl md:text-2xl font-black tracking-tight ${cardData.balance >= 0 ? 'text-[#4A90FF]' : 'text-red-400'}`}>
                        R$ {cardData.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                      <div className="flex flex-col">
                          <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">ID Usuário</span>
                          <span className="text-white text-[10px] font-bold tracking-wider">{userId}</span>
                      </div>
                      <div className="flex flex-col text-right">
                          <span className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">Categoria</span>
                          <span className="text-[#7A5CFA] text-[10px] font-black italic tracking-wider">PRIORITY BLACK</span>
                      </div>
                   </div>
                </div>
              </div>

              <div className="text-[7px] text-slate-600 font-black uppercase tracking-[0.4em] flex justify-between pt-4 border-t border-white/5">
                <span>INOVAFINANCE SECURE</span>
                <span className="text-white/10 italic">L2 ENCRYPTION</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="mt-10 w-full max-w-[380px] px-4 space-y-4 flex-shrink-0">
        <div className="bg-white/5 backdrop-blur-md p-5 rounded-[28px] border border-white/10 shadow-lg flex items-start gap-4 hover:bg-white/10 transition-all cursor-default group">
           <div className="w-10 h-10 rounded-2xl bg-[#7A5CFA]/20 flex items-center justify-center text-[#7A5CFA] shadow-inner group-hover:scale-110 transition-transform">
              <i className="fas fa-crown"></i>
           </div>
           <div>
              <h4 className="font-black text-white text-[11px] uppercase tracking-wider">Benefícios Inova Black</h4>
              <p className="text-slate-500 text-[10px] font-bold leading-relaxed mt-1">
                Acesso a salas VIP globais, cashback instantâneo de 3% e proteção de dados nível bancário.
              </p>
           </div>
        </div>

        <button className="w-full py-4 bg-gradient-to-r from-white/5 to-white/[0.08] hover:from-[#7A5CFA]/20 hover:to-[#4A90FF]/20 text-white rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] border border-white/10 transition-all active:scale-[0.97] shadow-xl">
          Personalizar Cartão
        </button>
      </div>
    </div>
  );
};

export default CardPage;

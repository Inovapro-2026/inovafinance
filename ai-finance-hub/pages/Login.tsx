
import React, { useState, useEffect } from 'react';
import { db } from '../db';

interface LoginProps {
  onLogin: (matricula: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [matricula, setMatricula] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleNumberClick = (num: string) => {
    if (matricula.length < 8) {
      setMatricula(prev => prev + num);
    }
  };

  const handleDelete = () => {
    setMatricula(prev => prev.slice(0, -1));
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (matricula.length >= 4) {
      setIsLoggingIn(true);
      setTimeout(() => onLogin(matricula), 600);
    }
  };

  // Fix: Explicitly defining NumberButton as a React.FC to resolve the 'key' prop assignment error in JSX.
  const NumberButton: React.FC<{ val: string; index: number }> = ({ val, index }) => (
    <button
      type="button"
      onClick={() => handleNumberClick(val)}
      style={{ animationDelay: `${index * 0.05}s` }}
      className={`w-16 h-16 rounded-2xl bg-white/5 border border-white/10 text-2xl font-black text-white 
                 active:scale-90 active:bg-[#7A5CFA] transition-all flex items-center justify-center
                 hover:bg-white/10 hover:border-[#7A5CFA]/30 animate-fadeIn`}
    >
      {val}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className={`w-full max-w-md transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} ${isLoggingIn ? 'scale-110 opacity-0 blur-xl' : 'scale-100'}`}>
        <div className="glass-card p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-[#7A5CFA] to-[#4A90FF] rounded-2xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-[#7A5CFA]/20">
              <i className="fas fa-rocket"></i>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter">INOVAFINANCE</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-1">Intelligence Access</p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 text-center uppercase tracking-widest">Matrícula</label>
              <div className="relative">
                <input 
                  type="text"
                  value={matricula}
                  readOnly
                  placeholder="••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-center text-3xl font-black text-white outline-none focus:border-[#7A5CFA]/50 transition-all"
                />
              </div>
            </div>

            {/* Numpad funcional - Sem sumiço */}
            <div className="grid grid-cols-3 gap-4 justify-items-center max-w-[260px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n, i) => (
                <NumberButton key={n} val={n} index={i} />
              ))}
              
              <div className="w-16 h-16"></div> {/* Spacer */}
              <NumberButton val="0" index={9} />
              <button 
                type="button" 
                onClick={handleDelete}
                className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center text-xl active:scale-90 transition-all hover:bg-red-500/20"
              >
                <i className="fas fa-backspace"></i>
              </button>
            </div>

            <button 
              type="submit"
              disabled={matricula.length < 4}
              className={`w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3
                ${matricula.length >= 4 
                  ? 'bg-gradient-to-r from-[#4A90FF] to-[#7A5CFA] text-white shadow-xl shadow-[#7A5CFA]/20' 
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
            >
              ACESSAR CONTA
              <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </form>

          {/* Decorative glows */}
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#4A90FF]/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-[#7A5CFA]/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;

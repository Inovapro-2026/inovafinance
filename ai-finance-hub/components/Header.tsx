
import React from 'react';

interface HeaderProps {
  matricula: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ matricula, onLogout }) => {
  return (
    <header className="w-full py-4 px-6 md:px-8 flex justify-between items-center bg-transparent">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-[#7A5CFA] rounded-xl flex items-center justify-center text-white shadow-lg">
          <i className="fas fa-rocket"></i>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#1A1A1A]">
          INOVA<span className="text-[#7A5CFA]">FINANCE</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-sm text-gray-600 font-medium">
          Matrícula: <span className="text-[#7A5CFA]">{matricula}</span>
        </div>
        <button 
          onClick={onLogout}
          className="px-4 py-1.5 border border-[#4A90FF] text-gray-800 rounded-lg hover:bg-[#4A90FF]/10 transition-colors text-sm font-semibold"
        >
          Sair
        </button>
      </div>
    </header>
  );
};

export default Header;

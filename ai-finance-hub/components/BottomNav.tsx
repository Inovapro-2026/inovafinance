
import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-white/20 h-20 flex items-center justify-around px-2 z-50">
      <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-[#7A5CFA]' : 'text-gray-400'}`}>
        {({ isActive }) => (
          <>
            <i className="fas fa-home text-xl"></i>
            <span className="text-[10px] font-bold">Home</span>
            {isActive && <div className="h-[3px] w-6 bg-[#7A5CFA] rounded-full mt-0.5"></div>}
          </>
        )}
      </NavLink>

      <NavLink to="/transactions" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-[#7A5CFA]' : 'text-gray-400'}`}>
        {({ isActive }) => (
          <>
            <i className="fas fa-exchange-alt text-xl"></i>
            <span className="text-[10px] font-bold">Transações</span>
            {isActive && <div className="h-[3px] w-6 bg-[#7A5CFA] rounded-full mt-0.5"></div>}
          </>
        )}
      </NavLink>

      <NavLink to="/ai" className="flex flex-col items-center -mt-8 relative">
        <div className="w-16 h-16 bg-gradient-to-br from-[#7A5CFA] to-[#4A90FF] rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform">
          <i className="fas fa-microphone text-2xl"></i>
        </div>
        <span className="text-[10px] font-bold text-[#7A5CFA] mt-1">AI Voice</span>
      </NavLink>

      <NavLink to="/card" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-[#7A5CFA]' : 'text-gray-400'}`}>
        {({ isActive }) => (
          <>
            <i className="fas fa-credit-card text-xl"></i>
            <span className="text-[10px] font-bold">Cartão</span>
            {isActive && <div className="h-[3px] w-6 bg-[#7A5CFA] rounded-full mt-0.5"></div>}
          </>
        )}
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-[#7A5CFA]' : 'text-gray-400'}`}>
        {({ isActive }) => (
          <>
            <i className="fas fa-user text-xl"></i>
            <span className="text-[10px] font-bold">Perfil</span>
            {isActive && <div className="h-[3px] w-6 bg-[#7A5CFA] rounded-full mt-0.5"></div>}
          </>
        )}
      </NavLink>
    </nav>
  );
};

export default BottomNav;

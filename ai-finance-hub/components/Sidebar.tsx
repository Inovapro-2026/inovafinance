
import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const navItems = [
    { path: '/', label: 'Visão Geral', icon: 'fa-chart-pie' },
    { path: '/transactions', label: 'Movimentações', icon: 'fa-exchange-alt' },
    { path: '/card', label: 'Cartão Black', icon: 'fa-credit-card' },
    { path: '/ai', label: 'AI', icon: 'fa-robot' },
    { path: '/goals', label: 'Metas', icon: 'fa-bullseye' },
    { path: '/profile', label: 'Perfil', icon: 'fa-user' },
  ];

  return (
    <aside className="w-64 h-full bg-white/40 backdrop-blur-sm border-r border-white/20 p-6 flex flex-col gap-8">
      <div className="py-4">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 mb-4">Menu</div>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-400 group
                ${isActive 
                  ? 'bg-white shadow-md border-l-4 border-l-[#7A5CFA]' 
                  : 'hover:bg-white/60 hover:scale-[1.03] hover:shadow-sm'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <i className={`fas ${item.icon} text-lg ${isActive ? 'text-[#7A5CFA]' : 'text-gray-500 group-hover:text-[#7A5CFA]'}`}></i>
                  <span className={`font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

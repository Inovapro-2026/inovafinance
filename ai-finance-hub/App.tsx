
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import AIPage from './pages/AIPage';
import GoalsPage from './pages/GoalsPage';
import ProfilePage from './pages/ProfilePage';
import CardPage from './pages/CardPage';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Header from './components/Header';

const FloatingActionButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Não mostrar o botão na tela de login ou na página de transações (onde já existe o botão)
  if (location.pathname === '/login' || location.pathname === '/transactions') return null;

  return (
    <button 
      onClick={() => navigate('/transactions')}
      className="fixed bottom-24 right-6 md:bottom-10 md:right-10 w-16 h-16 bg-[#7A5CFA] text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all z-[40] md:z-[60]"
    >
      <i className="fas fa-plus"></i>
    </button>
  );
};

const AppContent: React.FC = () => {
  const [userMatricula, setUserMatricula] = useState<string | null>(localStorage.getItem('user_id'));
  const navigate = useNavigate();

  const handleLogin = (matricula: string) => {
    localStorage.setItem('user_id', matricula);
    setUserMatricula(matricula);
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('user_id');
    setUserMatricula(null);
    navigate('/login');
  };

  if (!userMatricula) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]/50">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header matricula={userMatricula} onLogout={handleLogout} />
        
        <main className="flex-1 overflow-y-auto pb-28 md:pb-10 px-4 md:px-12">
          <Routes>
            <Route path="/" element={<Dashboard userId={userMatricula} />} />
            <Route path="/transactions" element={<TransactionsPage userId={userMatricula} />} />
            <Route path="/ai" element={<AIPage userId={userMatricula} />} />
            <Route path="/card" element={<CardPage userId={userMatricula} />} />
            <Route path="/goals" element={<GoalsPage userId={userMatricula} />} />
            <Route path="/profile" element={<ProfilePage userId={userMatricula} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <FloatingActionButton />

        {/* Mobile Nav */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;

import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BottomNav } from "./components/BottomNav";
import { SplashScreen } from "./components/SplashScreen";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Cadastros from "./pages/Cadastros";
import Subscribe from "./pages/Subscribe";
import PaymentCallback from "./pages/PaymentCallback";
import Card from "./pages/Card";
import Transactions from "./pages/Transactions";
import Goals from "./pages/Goals";
import AI from "./pages/AI";
import Planner from "./pages/Planner";
import Statement from "./pages/Statement";
import Affiliates from "./pages/Affiliates";
import Support from "./pages/Support";
import Subscription from "./pages/Subscription";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const SPLASH_SHOWN_KEY = 'inovabank_splash_shown';

function AppRoutes() {
  const location = useLocation();
  const { user } = useAuth();
  // Hide nav on login and admin pages
  const showNav = user && location.pathname !== '/login' && location.pathname !== '/admin';

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastros" element={<Cadastros />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/payment-callback" element={<PaymentCallback />} />
        <Route path="/" element={<Index />} />
        <Route path="/card" element={<Card />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/ai" element={<AI />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/statement" element={<Statement />} />
        <Route path="/affiliates" element={<Affiliates />} />
        <Route path="/support" element={<Support />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  );
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    // Check if splash was shown in this session
    const splashShown = sessionStorage.getItem(SPLASH_SHOWN_KEY);
    if (!splashShown) {
      setShowSplash(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      {!showSplash && <AppRoutes />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

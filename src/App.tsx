import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BottomNav } from "./components/BottomNav";
import { VideoSplash } from "./components/VideoSplash";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Cadastros from "./pages/Cadastros";
import Subscribe from "./pages/Subscribe";
import AffiliateSignup from "./pages/AffiliateSignup";
import PaymentCallback from "./pages/PaymentCallback";
import Card from "./pages/Card";
import Transactions from "./pages/Transactions";
import Goals from "./pages/Goals";
import AI from "./pages/AI";
import Planner from "./pages/Planner";
import Agenda from "./pages/Agenda";
import Rotinas from "./pages/Rotinas";
import Statement from "./pages/Statement";
import Affiliates from "./pages/Affiliates";
import AffiliatePanel from "./pages/AffiliatePanel";
import Support from "./pages/Support";
import Subscription from "./pages/Subscription";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const VIDEO_SHOWN_KEY = 'inovabank_video_shown';

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
        <Route path="/affiliate-signup" element={<AffiliateSignup />} />
        <Route path="/payment-callback" element={<PaymentCallback />} />
        <Route path="/" element={<Index />} />
        <Route path="/card" element={<Card />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/ai" element={<AI />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/rotinas" element={<Rotinas />} />
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
  const { user, isLoading } = useAuth();
  const [showVideo, setShowVideo] = useState<boolean | null>(null);

  useEffect(() => {
    // Only show video if user is NOT logged in
    // Wait for auth loading to complete before deciding
    if (!isLoading) {
      if (user) {
        // User is logged in, skip video
        setShowVideo(false);
      } else {
        // User is not logged in, show video
        setShowVideo(true);
      }
    }
  }, [user, isLoading]);

  const handleVideoComplete = () => {
    setShowVideo(false);
  };

  // Show nothing while loading auth state
  if (isLoading || showVideo === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showVideo) {
    return <VideoSplash onComplete={handleVideoComplete} />;
  }

  return <AppRoutes />;
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

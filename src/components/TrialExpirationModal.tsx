import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CreditCard, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrialExpirationModalProps {
  type: 'voice_limit' | 'trial_expired';
  isOpen: boolean;
  onClose: () => void;
  onContinueWithBrowserVoice?: () => void;
}

export function TrialExpirationModal({ 
  type, 
  isOpen, 
  onClose, 
  onContinueWithBrowserVoice 
}: TrialExpirationModalProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubscribe = () => {
    navigate('/subscribe');
    onClose();
  };

  const handleDecline = async () => {
    if (type === 'trial_expired') {
      // Delete account and logout
      setIsDeleting(true);
      try {
        const matricula = localStorage.getItem('inovabank_matricula');
        if (matricula) {
          // Delete user data
          await supabase
            .from('users_matricula')
            .delete()
            .eq('matricula', parseInt(matricula));
        }
        logout();
        navigate('/login');
      } catch (error) {
        console.error('Error deleting account:', error);
      } finally {
        setIsDeleting(false);
      }
    } else if (type === 'voice_limit') {
      // Just continue with browser voice
      onContinueWithBrowserVoice?.();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-background/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className={`p-6 ${type === 'trial_expired' ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20' : 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20'}`}>
            <div className="flex items-center justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${type === 'trial_expired' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                {type === 'trial_expired' ? (
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                ) : (
                  <Clock className="w-8 h-8 text-amber-500" />
                )}
              </div>
            </div>
            <h2 className="text-xl font-bold text-center">
              {type === 'trial_expired' 
                ? 'Seu teste grátis expirou' 
                : 'Limite de voz atingido'}
            </h2>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-center text-muted-foreground mb-6">
              {type === 'trial_expired' 
                ? 'Seu período de teste de 24 horas terminou. Deseja assinar para continuar usando o INOVAFINANCE?' 
                : 'Seu plano atual é gratuito. Para continuar usando a voz natural ISA, assine agora!'}
            </p>

            <div className="space-y-3">
              <Button
                className="w-full h-12 text-lg bg-gradient-primary"
                onClick={handleSubscribe}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Assinar agora
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleDecline}
                disabled={isDeleting}
              >
                {type === 'trial_expired' 
                  ? (isDeleting ? 'Encerrando...' : 'Não, encerrar conta')
                  : 'Continuar com voz do navegador'}
              </Button>
            </div>

            {type === 'trial_expired' && (
              <p className="text-xs text-center text-muted-foreground mt-4">
                Ao não assinar, sua conta e todos os dados serão excluídos permanentemente.
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

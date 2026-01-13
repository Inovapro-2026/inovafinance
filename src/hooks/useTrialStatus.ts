import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TrialStatus = {
  isFreeTrial: boolean;
  isPremium: boolean;
  isTrialExpired: boolean;
  isVoiceLimitReached: boolean;
  canUseElevenLabs: boolean;
  trialEndsAt: Date | null;
  voiceLimitAt: Date | null;
  timeRemaining: number; // in milliseconds
  voiceTimeRemaining: number; // in milliseconds
};

export function useTrialStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<TrialStatus>({
    isFreeTrial: false,
    isPremium: false,
    isTrialExpired: false,
    isVoiceLimitReached: false,
    canUseElevenLabs: true,
    trialEndsAt: null,
    voiceLimitAt: null,
    timeRemaining: 0,
    voiceTimeRemaining: 0,
  });
  const [showVoiceLimitModal, setShowVoiceLimitModal] = useState(false);
  const [showTrialExpiredModal, setShowTrialExpiredModal] = useState(false);
  const [useBrowserVoice, setUseBrowserVoice] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user?.userId) return;

    try {
      const { data, error } = await supabase
        .from('users_matricula')
        .select('subscription_type, subscription_status, subscription_end_date, trial_started_at, trial_voice_limit_at')
        .eq('matricula', user.userId)
        .single();

      if (error || !data) return;

      const now = new Date();
      const subscriptionType = data.subscription_type || 'none';
      const subscriptionStatus = data.subscription_status;
      
      const isFreeTrial = subscriptionType === 'FREE_TRIAL';
      const isPremium = subscriptionType === 'PREMIUM' || subscriptionStatus === 'active';
      
      const trialEndsAt = data.subscription_end_date ? new Date(data.subscription_end_date) : null;
      const voiceLimitAt = data.trial_voice_limit_at ? new Date(data.trial_voice_limit_at) : null;

      const isTrialExpired = isFreeTrial && trialEndsAt && now > trialEndsAt;
      const isVoiceLimitReached = isFreeTrial && voiceLimitAt && now > voiceLimitAt;
      
      // Can use ElevenLabs if:
      // 1. Premium user
      // 2. Free trial user within voice limit (2 hours)
      // 3. User chose to use browser voice after limit
      const canUseElevenLabs = isPremium || (isFreeTrial && !isVoiceLimitReached && !useBrowserVoice);

      const timeRemaining = trialEndsAt ? Math.max(0, trialEndsAt.getTime() - now.getTime()) : 0;
      const voiceTimeRemaining = voiceLimitAt ? Math.max(0, voiceLimitAt.getTime() - now.getTime()) : 0;

      setStatus({
        isFreeTrial,
        isPremium,
        isTrialExpired: !!isTrialExpired,
        isVoiceLimitReached: !!isVoiceLimitReached,
        canUseElevenLabs,
        trialEndsAt,
        voiceLimitAt,
        timeRemaining,
        voiceTimeRemaining,
      });

      // Show modals if needed
      if (isTrialExpired && !showTrialExpiredModal) {
        setShowTrialExpiredModal(true);
      } else if (isVoiceLimitReached && !useBrowserVoice && !showVoiceLimitModal) {
        setShowVoiceLimitModal(true);
      }

    } catch (error) {
      console.error('Error checking trial status:', error);
    }
  }, [user?.userId, useBrowserVoice, showVoiceLimitModal, showTrialExpiredModal]);

  // Check status on mount and periodically
  useEffect(() => {
    checkStatus();

    // Check every minute
    const interval = setInterval(checkStatus, 60000);

    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleContinueWithBrowserVoice = useCallback(() => {
    setUseBrowserVoice(true);
    setShowVoiceLimitModal(false);
  }, []);

  const closeVoiceLimitModal = useCallback(() => {
    setShowVoiceLimitModal(false);
  }, []);

  const closeTrialExpiredModal = useCallback(() => {
    setShowTrialExpiredModal(false);
  }, []);

  return {
    ...status,
    showVoiceLimitModal,
    showTrialExpiredModal,
    useBrowserVoice,
    handleContinueWithBrowserVoice,
    closeVoiceLimitModal,
    closeTrialExpiredModal,
    checkStatus,
  };
}

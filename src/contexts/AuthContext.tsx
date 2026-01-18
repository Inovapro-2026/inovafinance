import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProfile, createProfile, updateProfile, type Profile } from '@/lib/db';

interface AuthContextType {
  user: Profile | null;
  isLoading: boolean;
  login: (
    matricula: number, 
    fullName?: string, 
    email?: string,
    phone?: string,
    initialBalance?: number,
    creditLimit?: number,
    creditDueDay?: number
  ) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

// Keep a single Context instance across Fast Refresh/HMR to avoid "used within a provider" false negatives.
const AuthContext: React.Context<AuthContextType | undefined> =
  ((globalThis as unknown as { __INOVABANK_AUTH_CONTEXT__?: React.Context<AuthContextType | undefined> })
    .__INOVABANK_AUTH_CONTEXT__) ?? createContext<AuthContextType | undefined>(undefined);

(globalThis as unknown as { __INOVABANK_AUTH_CONTEXT__?: React.Context<AuthContextType | undefined> }).__INOVABANK_AUTH_CONTEXT__ =
  AuthContext;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedMatricula = localStorage.getItem('inovabank_matricula');
    if (storedMatricula) {
      loadUser(parseInt(storedMatricula, 10));
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadUser = async (matricula: number) => {
    try {
      const profile = await getProfile(matricula);
      if (profile) {
        // Only set user if approved - otherwise clear the session
        if (profile.userStatus === 'approved') {
          setUser(profile);
        } else {
          // User is not approved, clear stored matricula
          localStorage.removeItem('inovabank_matricula');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (user?.userId) {
      const profile = await getProfile(user.userId);
      if (profile) {
        setUser(profile);
      }
    }
  };

  const login = async (
    matricula: number, 
    fullName?: string, 
    email?: string,
    phone?: string,
    initialBalance?: number,
    creditLimit?: number,
    creditDueDay?: number
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      let profile = await getProfile(matricula);
      
      if (!profile && fullName) {
        // Create new profile in Supabase
        await createProfile({
          userId: matricula,
          fullName,
          email: email || '',
          phone: phone || '',
          initialBalance: initialBalance || 0,
          hasCreditCard: false,
          creditLimit: creditLimit || 0,
          creditAvailable: 0,
          creditUsed: 0,
          creditDueDay: creditDueDay,
          userStatus: 'pending',
          isAffiliate: false,
          affiliateBalance: 0,
        });
        profile = await getProfile(matricula);
      }
      
      if (profile) {
        // Only allow login for approved users
        if (profile.userStatus === 'approved') {
          setUser(profile);
          localStorage.setItem('inovabank_matricula', matricula.toString());
          return true;
        }
        // User exists but not approved
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('inovabank_matricula');
    // Clear audio flags so they play again on next login
    sessionStorage.removeItem('login_audio_played');
    sessionStorage.removeItem('intro_video_shown');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

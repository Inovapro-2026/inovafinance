
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { UserProfile } from '../types';

const ProfilePage: React.FC<{ userId: string }> = ({ userId }) => {
  const [profile, setProfile] = useState<UserProfile>({ userId });
  const [isEditing, setIsEditing] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await db.profiles.get(userId);
        if (data) {
          setProfile(data);
        } else {
          // Se não houver perfil, cria um inicial
          const newProfile = { userId, initialBalance: 0 };
          await db.profiles.add(newProfile);
          setProfile(newProfile);
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
    
    if (window.PublicKeyCredential) {
      setIsBiometricSupported(true);
    }
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.profiles.put(profile);
      setIsEditing(false);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar perfil:", err);
      alert("Houve um erro tecnológico ao salvar seus dados.");
    }
  };

  const registerBiometrics = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userID = new TextEncoder().encode(userId);

      const publicKeyCredentialCreationOptions: any = {
        challenge,
        rp: { name: "INOVAFINANCE", id: window.location.hostname || "localhost" },
        user: {
          id: userID,
          name: profile.fullName || userId,
          displayName: profile.fullName || userId,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: { userVerification: "preferred" },
        timeout: 60000,
        attestation: "none",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as any;

      if (credential) {
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
        const updatedProfile = { ...profile, biometricCredentialId: credentialId };
        await db.profiles.put(updatedProfile);
        setProfile(updatedProfile);
        alert("Biometria cadastrada com sucesso!");
      }
    } catch (err) {
      alert("Não foi possível cadastrar a biometria.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 font-bold animate-pulse">
        <i className="fas fa-circle-notch fa-spin text-4xl mb-4"></i>
        Sincronizando dados seguros...
      </div>
    );
  }

  return (
    <div className="py-4 max-w-2xl mx-auto space-y-6">
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[30px] border border-white/40 shadow-xl relative overflow-hidden">
        {/* Banner de status salvo */}
        {savedStatus && (
          <div className="absolute top-0 left-0 right-0 bg-green-500 text-white py-2 text-center text-xs font-black uppercase tracking-widest animate-slideDown">
            <i className="fas fa-check-circle mr-2"></i> Perfil atualizado com sucesso
          </div>
        )}

        <div className="flex flex-col items-center mb-8 mt-4">
          <div className="w-24 h-24 bg-gradient-to-br from-[#7A5CFA] to-[#4A90FF] rounded-full flex items-center justify-center text-white text-4xl shadow-lg mb-4 relative group">
            <i className="fas fa-user"></i>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="absolute -right-2 -bottom-2 w-10 h-10 bg-white rounded-full text-[#7A5CFA] shadow-md flex items-center justify-center hover:scale-110 transition-transform"
              >
                <i className="fas fa-pen text-sm"></i>
              </button>
            )}
          </div>
          <h2 className="text-2xl font-black text-gray-800">
            {profile.fullName || 'Usuário Inova'}
          </h2>
          <p className="text-gray-500 font-bold text-sm">Matrícula: {userId}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Saldo Inicial (Patrimônio Base)</label>
              <div className={`relative transition-all ${isEditing ? 'scale-[1.02]' : 'opacity-80'}`}>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black">R$</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={profile.initialBalance ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setProfile({...profile, initialBalance: val});
                  }}
                  disabled={!isEditing}
                  placeholder="0,00"
                  className={`w-full bg-gray-50 border-2 rounded-2xl py-4 pl-12 pr-6 font-black text-xl text-gray-800 outline-none transition-all
                    ${isEditing ? 'border-[#7A5CFA] bg-white shadow-inner' : 'border-transparent'}
                  `}
                />
              </div>
              <p className="mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Este valor é somado aos seus ganhos e subtraído dos seus gastos.
              </p>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">Nome Completo</label>
              <input 
                type="text" 
                value={profile.fullName || ''}
                onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                disabled={!isEditing}
                placeholder="Ex: João Silva"
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-6 font-bold text-gray-800 outline-none transition-all
                  ${isEditing ? 'border-[#7A5CFA] bg-white shadow-inner' : 'border-transparent'}
                `}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 mb-2 uppercase tracking-widest">E-mail de Contato</label>
              <input 
                type="email" 
                value={profile.email || ''}
                onChange={(e) => setProfile({...profile, email: e.target.value})}
                disabled={!isEditing}
                placeholder="nome@exemplo.com"
                className={`w-full bg-gray-50 border-2 rounded-2xl py-4 px-6 font-bold text-gray-800 outline-none transition-all
                  ${isEditing ? 'border-[#7A5CFA] bg-white shadow-inner' : 'border-transparent'}
                `}
              />
            </div>
          </div>

          <div className="pt-6">
            {!isEditing ? (
              <button 
                type="button" 
                onClick={() => setIsEditing(true)}
                className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <i className="fas fa-edit"></i>
                AJUSTAR PERFIL E SALDO
              </button>
            ) : (
              <div className="flex gap-4">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditing(false);
                    // Recarrega os dados originais se cancelar
                    db.profiles.get(userId).then(d => d && setProfile(d));
                  }} 
                  className="flex-1 border-2 border-gray-200 text-gray-500 py-4 rounded-2xl font-black transition-all hover:bg-gray-50"
                >
                  CANCELAR
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-[#4A90FF] text-white py-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                  <i className="fas fa-save"></i>
                  SALVAR
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      <div className="bg-gradient-to-br from-[#7A5CFA]/10 to-[#4A90FF]/10 p-8 rounded-[30px] border border-white shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#7A5CFA] shadow-sm">
            <i className="fas fa-shield-halved text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-800">Segurança</h3>
            <p className="text-sm text-gray-500 font-medium">Biometria e Acesso Rápido</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between bg-white/50 p-6 rounded-2xl border border-white/40 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <i className={`fas fa-fingerprint text-2xl ${profile.biometricCredentialId ? 'text-green-500' : 'text-gray-300'}`}></i>
             <div>
               <p className="font-bold text-gray-800">Autenticação Nativa</p>
               <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                 {profile.biometricCredentialId ? 'PROTEÇÃO ATIVADA' : 'NÃO CONFIGURADO'}
               </p>
             </div>
          </div>
          {isBiometricSupported ? (
            <button 
              onClick={registerBiometrics} 
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-black transition-all 
                ${profile.biometricCredentialId 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' 
                  : 'bg-[#7A5CFA] text-white shadow-md hover:scale-105 active:scale-95'
                }`} 
              disabled={!!profile.biometricCredentialId}
            >
              {profile.biometricCredentialId ? 'JÁ CADASTRADO' : 'ATIVAR AGORA'}
            </button>
          ) : (
            <span className="text-xs text-red-500 font-bold bg-red-50 px-3 py-1 rounded-lg">HARDWARE INCOMPATÍVEL</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

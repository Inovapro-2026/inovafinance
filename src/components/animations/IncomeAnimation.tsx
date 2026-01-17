import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transactionSounds } from '@/services/transactionSounds';

interface IncomeAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const IncomeAnimation = ({ isVisible, onComplete }: IncomeAnimationProps) => {
  const [stage, setStage] = useState<'idle' | 'wallet' | 'open' | 'money' | 'close' | 'done'>('idle');

  useEffect(() => {
    if (isVisible) {
      setStage('wallet');
      
      // Wallet appears
      const timer1 = setTimeout(() => setStage('open'), 600);
      // Wallet opens, money flies in
      const timer2 = setTimeout(() => {
        setStage('money');
        // Play cash sound when money enters
        transactionSounds.playIncomeSound();
      }, 1200);
      // Money animation
      const timer3 = setTimeout(() => setStage('close'), 2200);
      // Wallet closes
      const timer4 = setTimeout(() => setStage('done'), 2700);
      // Animation complete
      const timer5 = setTimeout(() => {
        setStage('idle');
        onComplete();
      }, 3000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
      };
    }
  }, [isVisible, onComplete]);

  const bills = [0, 1, 2, 3, 4];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ perspective: '1200px' }}
        >
          {/* Light gradient overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-b from-green-900/40 via-green-950/60 to-black/80 backdrop-blur-md"
          />

          {/* Sparkle effects */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0, 
                  x: Math.random() * window.innerWidth, 
                  y: -20 
                }}
                animate={{ 
                  opacity: [0, 1, 0], 
                  y: window.innerHeight + 20,
                  rotate: 360
                }}
                transition={{ 
                  duration: 2 + Math.random() * 2, 
                  delay: Math.random() * 2,
                  repeat: Infinity
                }}
                className="absolute w-2 h-2 bg-green-400/50 rounded-full"
              />
            ))}
          </div>

          {/* 3D Scene Container */}
          <div className="relative z-10 w-full h-full flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
            
            {/* Wallet Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.3, rotateX: -30 }}
              animate={{
                opacity: stage !== 'idle' ? 1 : 0,
                scale: stage === 'wallet' ? 1 : stage === 'done' ? 0.9 : 1,
                rotateX: stage === 'open' || stage === 'money' ? -15 : 0,
                y: stage === 'done' ? -20 : 0
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Wallet Back */}
              <div className="w-64 h-40 bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-2xl shadow-2xl border border-emerald-700/50">
                {/* Leather texture */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)] rounded-2xl" />
                <div className="absolute inset-0 opacity-20 rounded-2xl" 
                  style={{ 
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")'
                  }} 
                />
                
                {/* Stitching */}
                <div className="absolute inset-3 border-2 border-dashed border-emerald-700/30 rounded-xl" />
              </div>

              {/* Wallet Front Flap */}
              <motion.div
                initial={{ rotateX: 0 }}
                animate={{
                  rotateX: stage === 'open' || stage === 'money' ? -120 : stage === 'close' || stage === 'done' ? 0 : 0
                }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                className="absolute top-0 left-0 w-64 h-24 origin-top"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Flap Front */}
                <div className="absolute w-full h-full bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-t-2xl shadow-lg border border-emerald-600/50">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)] rounded-t-2xl" />
                  
                  {/* Logo/Clasp */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-6 bg-gradient-to-b from-amber-500 to-amber-700 rounded-full flex items-center justify-center shadow-lg">
                    <div className="w-3 h-3 bg-amber-300 rounded-full" />
                  </div>
                </div>

                {/* Flap Back (inside) */}
                <div 
                  className="absolute w-full h-full bg-gradient-to-b from-emerald-950 to-emerald-900 rounded-t-2xl"
                  style={{ transform: 'rotateX(180deg)', backfaceVisibility: 'hidden' }}
                >
                  {/* Card slots */}
                  <div className="p-3 space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-4 bg-emerald-800/50 rounded w-3/4 ml-auto" />
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Money Bills Inside */}
              <div className="absolute top-12 left-1/2 -translate-x-1/2" style={{ transformStyle: 'preserve-3d' }}>
                {bills.map((i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      opacity: 0, 
                      y: -200 - (i * 30), 
                      x: (i - 2) * 100,
                      rotateZ: (i - 2) * 15,
                      scale: 0.5
                    }}
                    animate={{
                      opacity: stage === 'money' || stage === 'close' || stage === 'done' ? 1 : 0,
                      y: stage === 'money' ? [null, -50, 0] : stage === 'close' || stage === 'done' ? -5 + (i * 2) : -200,
                      x: stage === 'money' ? [null, (i - 2) * 30, (i - 2) * 3] : (i - 2) * 3,
                      rotateZ: stage === 'money' ? [null, (i - 2) * 10, (i - 2) * 2] : (i - 2) * 2,
                      scale: stage === 'money' || stage === 'close' || stage === 'done' ? 1 : 0.5
                    }}
                    transition={{ 
                      duration: 0.6, 
                      delay: i * 0.1,
                      ease: 'easeOut'
                    }}
                    className="absolute w-28 h-14 rounded-lg shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
                      transformStyle: 'preserve-3d'
                    }}
                  >
                    {/* Bill Design */}
                    <div className="w-full h-full relative overflow-hidden rounded-lg border border-green-400/30">
                      {/* Decorative patterns */}
                      <div className="absolute inset-0 opacity-30">
                        <div className="absolute top-1 left-1 w-8 h-8 border-2 border-green-300 rounded-full" />
                        <div className="absolute bottom-1 right-1 w-8 h-8 border-2 border-green-300 rounded-full" />
                      </div>
                      
                      {/* Center amount */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-green-100 font-bold text-lg drop-shadow-lg">R$</span>
                      </div>
                      
                      {/* Shine effect */}
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 1, delay: i * 0.2, repeat: Infinity, repeatDelay: 2 }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Plus Icon */}
              <AnimatePresence>
                {(stage === 'money' || stage === 'close') && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, y: -100 }}
                    animate={{ opacity: 1, scale: 1, y: -80 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="absolute left-1/2 -translate-x-1/2 top-0"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-xl">
                      <span className="text-white text-3xl font-bold">+</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Success Burst */}
            <AnimatePresence>
              {stage === 'done' && (
                <>
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 2] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute w-80 h-80 rounded-full bg-gradient-radial from-green-500/40 to-transparent"
                  />
                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 60 }}
                    exit={{ opacity: 0 }}
                    className="absolute text-green-400 font-bold text-xl"
                  >
                    Ganho Registrado!
                  </motion.p>
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { transactionSounds } from '@/services/transactionSounds';

interface ExpenseAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const ExpenseAnimation = ({ isVisible, onComplete }: ExpenseAnimationProps) => {
  const [stage, setStage] = useState<'idle' | 'card' | 'approach' | 'payment' | 'done'>('idle');

  useEffect(() => {
    if (isVisible) {
      setStage('card');
      
      // Card appears and rotates
      const timer1 = setTimeout(() => setStage('approach'), 800);
      // Card approaches machine
      const timer2 = setTimeout(() => {
        setStage('payment');
        // Play payment sound when card touches machine
        transactionSounds.playExpenseSound();
      }, 1800);
      // Payment confirmed
      const timer3 = setTimeout(() => setStage('done'), 2500);
      // Animation complete
      const timer4 = setTimeout(() => {
        setStage('idle');
        onComplete();
      }, 3000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [isVisible, onComplete]);

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
          {/* Dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* 3D Scene Container */}
          <div className="relative z-10 w-full h-full flex items-center justify-center" style={{ transformStyle: 'preserve-3d' }}>
            
            {/* Credit Card */}
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.5,
                rotateY: 0,
                z: 0,
                y: 0
              }}
              animate={{
                opacity: stage !== 'idle' ? 1 : 0,
                scale: stage === 'card' ? 1 : stage === 'approach' ? 0.8 : 0.7,
                rotateY: stage === 'card' ? [0, 180, 360] : 0,
                z: stage === 'approach' || stage === 'payment' ? 200 : 0,
                y: stage === 'approach' ? 80 : stage === 'payment' ? 100 : 0,
                x: stage === 'payment' ? 0 : 0
              }}
              transition={{
                duration: stage === 'card' ? 0.8 : 0.6,
                ease: 'easeInOut',
                rotateY: { duration: 0.8, ease: 'easeInOut' }
              }}
              className="absolute w-72 h-44 rounded-2xl overflow-hidden"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Card Design */}
              <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] border border-white/10 rounded-2xl p-5 shadow-2xl">
                {/* Holographic overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-transparent to-blue-500/20 rounded-2xl" />
                <div className="absolute inset-0 overflow-hidden rounded-2xl">
                  <motion.div
                    animate={{ x: ['0%', '200%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                  />
                </div>
                
                {/* Card Content */}
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-sm">IB</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="w-4 h-4 rounded-full bg-white/20" />
                      <div className="w-4 h-4 rounded-full bg-white/10" />
                    </div>
                  </div>
                  
                  {/* Chip */}
                  <div className="mt-4">
                    <div className="w-12 h-9 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                      <div className="w-full h-full grid grid-cols-3 gap-0.5 p-1.5">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="bg-amber-700/50 rounded-sm" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Number */}
                  <div className="mt-3">
                    <p className="font-mono text-sm tracking-widest text-white/80">
                      •••• •••• •••• 4532
                    </p>
                  </div>

                  <div className="mt-auto flex justify-between items-end">
                    <div>
                      <p className="text-[8px] text-white/40 uppercase">Titular</p>
                      <p className="text-xs text-white/80 uppercase tracking-wide">INOVAPRO BLACK</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] text-white/40">VALID</p>
                      <p className="font-mono text-xs text-white/80">12/28</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Card Machine */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.8 }}
              animate={{
                opacity: stage === 'approach' || stage === 'payment' || stage === 'done' ? 1 : 0,
                y: stage === 'approach' || stage === 'payment' || stage === 'done' ? 0 : 100,
                scale: 1
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute bottom-1/4 w-48 h-72"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Machine Body */}
              <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-4 shadow-2xl border border-gray-700">
                {/* Screen */}
                <div className="w-full h-20 bg-gradient-to-b from-gray-900 to-black rounded-xl mb-3 flex items-center justify-center border border-gray-700">
                  <motion.div
                    animate={{
                      opacity: stage === 'payment' || stage === 'done' ? 1 : 0.3,
                      scale: stage === 'payment' || stage === 'done' ? [1, 1.1, 1] : 1
                    }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                  >
                    {stage === 'done' ? (
                      <div className="flex flex-col items-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200 }}
                          className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mb-1"
                        >
                          <span className="text-white text-lg">✓</span>
                        </motion.div>
                        <span className="text-green-400 text-xs font-medium">APROVADO</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">APROXIME O CARTÃO</span>
                    )}
                  </motion.div>
                </div>

                {/* NFC Zone */}
                <motion.div
                  animate={{
                    boxShadow: stage === 'payment' || stage === 'done' 
                      ? ['0 0 20px rgba(34, 197, 94, 0.5)', '0 0 40px rgba(34, 197, 94, 0.8)', '0 0 20px rgba(34, 197, 94, 0.5)']
                      : '0 0 10px rgba(139, 92, 246, 0.3)'
                  }}
                  transition={{ duration: 0.5, repeat: stage === 'approach' ? Infinity : 0 }}
                  className="w-full h-16 bg-gradient-to-b from-gray-700 to-gray-800 rounded-xl flex items-center justify-center border border-gray-600"
                >
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          opacity: stage === 'approach' || stage === 'payment' ? [0.3, 1, 0.3] : 0.3,
                          height: stage === 'approach' || stage === 'payment' ? [8, 16, 8] : 8
                        }}
                        transition={{ 
                          duration: 0.5, 
                          delay: i * 0.1, 
                          repeat: stage === 'approach' ? Infinity : 0 
                        }}
                        className="w-1 bg-purple-400 rounded-full"
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Keypad */}
                <div className="mt-3 grid grid-cols-3 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((key) => (
                    <div
                      key={key}
                      className="h-6 bg-gray-700 rounded flex items-center justify-center text-gray-400 text-[10px]"
                    >
                      {key}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Success Glow */}
            <AnimatePresence>
              {stage === 'done' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 2, 2.5] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute w-40 h-40 rounded-full bg-gradient-radial from-green-500/50 to-transparent"
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

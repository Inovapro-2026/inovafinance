import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type AvatarMood = 'idle' | 'listening' | 'thinking' | 'happy' | 'serious' | 'angry' | 'celebration';

interface IsaAvatar3DProps {
  mood?: AvatarMood;
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function IsaAvatar3D({ mood = 'idle', isSpeaking = false, size = 'lg' }: IsaAvatar3DProps) {
  const [blinkState, setBlinkState] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);

  // Natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Mouth movement when speaking
  useEffect(() => {
    if (isSpeaking) {
      const mouthInterval = setInterval(() => {
        setMouthOpen(Math.random() * 0.8 + 0.2);
      }, 100);
      return () => clearInterval(mouthInterval);
    } else {
      setMouthOpen(0);
    }
  }, [isSpeaking]);

  const sizeClasses = {
    sm: 'w-24 h-32',
    md: 'w-32 h-44',
    lg: 'w-44 h-60'
  };

  const getMoodStyles = () => {
    switch (mood) {
      case 'happy':
      case 'celebration':
        return { eyeScale: 1.1, mouthCurve: 8, blush: true };
      case 'serious':
        return { eyeScale: 0.9, mouthCurve: 0, blush: false };
      case 'angry':
        return { eyeScale: 0.8, mouthCurve: -3, blush: false };
      case 'listening':
        return { eyeScale: 1.05, mouthCurve: 2, blush: false };
      case 'thinking':
        return { eyeScale: 1, mouthCurve: 1, blush: false };
      default:
        return { eyeScale: 1, mouthCurve: 4, blush: false };
    }
  };

  const moodStyles = getMoodStyles();

  return (
    <div className={`${sizeClasses[size]} relative perspective-[1000px]`}>
      {/* Ambient glow */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-30 blur-3xl"
        style={{
          background: mood === 'happy' || mood === 'celebration' 
            ? 'radial-gradient(circle, #34d399 0%, transparent 70%)' 
            : mood === 'angry' || mood === 'serious'
            ? 'radial-gradient(circle, #f87171 0%, transparent 70%)'
            : 'radial-gradient(circle, #a78bfa 0%, transparent 70%)'
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* 3D Container with subtle rotation */}
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{
          rotateY: mood === 'listening' ? -5 : mood === 'thinking' ? 5 : 0,
          rotateX: mood === 'listening' ? 5 : 0,
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Body/Shoulders */}
        <motion.div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[45%] rounded-t-[100%] overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #7c3aed 0%, #5b21b6 50%, #4c1d95 100%)',
            boxShadow: 'inset 0 10px 30px rgba(255,255,255,0.1), inset 0 -10px 30px rgba(0,0,0,0.3)'
          }}
          animate={{
            y: mood === 'celebration' ? [0, -3, 0] : 0
          }}
          transition={{
            duration: 0.5,
            repeat: mood === 'celebration' ? Infinity : 0
          }}
        >
          {/* Collar/Neckline detail */}
          <div 
            className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-6 rounded-b-full"
            style={{
              background: 'linear-gradient(180deg, #f5d0fe 0%, #fce7f3 100%)',
            }}
          />
          {/* Shoulder highlights */}
          <div className="absolute top-2 left-[15%] w-8 h-8 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          <div className="absolute top-2 right-[15%] w-8 h-8 rounded-full bg-gradient-to-bl from-white/20 to-transparent" />
        </motion.div>

        {/* Neck */}
        <div
          className="absolute bottom-[38%] left-1/2 -translate-x-1/2 w-[22%] h-[15%] rounded-b-lg"
          style={{
            background: 'linear-gradient(180deg, #fce7f3 0%, #f5d0fe 100%)',
            boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.1), inset -2px 0 4px rgba(0,0,0,0.1)'
          }}
        />

        {/* Head */}
        <motion.div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[75%] h-[55%] rounded-[50%] overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #fff1f2 0%, #fce7f3 30%, #f5d0fe 100%)',
            boxShadow: `
              inset 5px 5px 20px rgba(255,255,255,0.8),
              inset -5px -5px 20px rgba(0,0,0,0.05),
              0 10px 40px rgba(0,0,0,0.15),
              0 5px 20px rgba(124,58,237,0.2)
            `
          }}
          animate={{
            rotateZ: mood === 'listening' ? -3 : mood === 'thinking' ? 3 : 0,
            y: isSpeaking ? [0, -1, 0] : 0
          }}
          transition={{
            rotateZ: { duration: 0.3 },
            y: { duration: 0.15, repeat: isSpeaking ? Infinity : 0 }
          }}
        >
          {/* Face container */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-[25%]">
            
            {/* Eyes container */}
            <div className="flex gap-[35%] items-center mb-[8%]">
              {/* Left Eye */}
              <motion.div
                className="relative w-5 h-6 rounded-[45%] bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden"
                animate={{
                  scaleY: blinkState ? 0.1 : moodStyles.eyeScale,
                  scaleX: moodStyles.eyeScale
                }}
                transition={{ duration: 0.1 }}
              >
                {/* Eye shine */}
                <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white opacity-80" />
                <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-white opacity-50" />
                
                {/* Iris gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-600/30 to-transparent" />
              </motion.div>

              {/* Right Eye */}
              <motion.div
                className="relative w-5 h-6 rounded-[45%] bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden"
                animate={{
                  scaleY: blinkState ? 0.1 : moodStyles.eyeScale,
                  scaleX: moodStyles.eyeScale
                }}
                transition={{ duration: 0.1 }}
              >
                <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white opacity-80" />
                <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-white opacity-50" />
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-purple-600/30 to-transparent" />
              </motion.div>
            </div>

            {/* Eyebrows */}
            <div className="absolute top-[28%] flex gap-[30%] w-full justify-center">
              <motion.div
                className="w-6 h-1.5 rounded-full bg-gradient-to-r from-purple-900/60 to-purple-800/40"
                animate={{
                  rotateZ: mood === 'angry' ? 15 : mood === 'serious' ? 5 : 0,
                  y: mood === 'happy' ? -2 : 0
                }}
              />
              <motion.div
                className="w-6 h-1.5 rounded-full bg-gradient-to-l from-purple-900/60 to-purple-800/40"
                animate={{
                  rotateZ: mood === 'angry' ? -15 : mood === 'serious' ? -5 : 0,
                  y: mood === 'happy' ? -2 : 0
                }}
              />
            </div>

            {/* Blush (when happy) */}
            {moodStyles.blush && (
              <>
                <motion.div
                  className="absolute top-[48%] left-[12%] w-4 h-2.5 rounded-full bg-pink-300/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                />
                <motion.div
                  className="absolute top-[48%] right-[12%] w-4 h-2.5 rounded-full bg-pink-300/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                />
              </>
            )}

            {/* Nose */}
            <div className="w-2 h-2 rounded-full bg-gradient-to-b from-pink-200/50 to-pink-300/30 mb-[5%]" />

            {/* Mouth */}
            <motion.div
              className="relative w-8 h-4 flex items-center justify-center"
              animate={{
                scaleY: 1 + mouthOpen * 0.5
              }}
            >
              <svg viewBox="0 0 40 20" className="w-full h-full">
                <motion.path
                  d={`M 5 10 Q 20 ${10 + moodStyles.mouthCurve + mouthOpen * 8} 35 10`}
                  fill="none"
                  stroke="#be185d"
                  strokeWidth="3"
                  strokeLinecap="round"
                  animate={{
                    d: isSpeaking 
                      ? `M 5 10 Q 20 ${10 + mouthOpen * 10} 35 10`
                      : `M 5 10 Q 20 ${10 + moodStyles.mouthCurve} 35 10`
                  }}
                />
                {(isSpeaking || mood === 'happy' || mood === 'celebration') && (
                  <motion.ellipse
                    cx="20"
                    cy="12"
                    rx="8"
                    ry={3 + mouthOpen * 5}
                    fill="#be185d"
                    animate={{
                      ry: isSpeaking ? [3, 6, 3] : 4
                    }}
                    transition={{
                      duration: 0.15,
                      repeat: isSpeaking ? Infinity : 0
                    }}
                  />
                )}
              </svg>
            </motion.div>
          </div>
        </motion.div>

        {/* Hair */}
        <motion.div
          className="absolute -top-[2%] left-1/2 -translate-x-1/2 w-[85%] h-[40%]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Main hair volume */}
          <div
            className="absolute inset-0 rounded-t-[50%] rounded-b-[30%]"
            style={{
              background: 'linear-gradient(180deg, #581c87 0%, #7c3aed 30%, #6d28d9 60%, #5b21b6 100%)',
              boxShadow: 'inset 0 10px 30px rgba(255,255,255,0.2), inset 0 -5px 20px rgba(0,0,0,0.3)'
            }}
          />
          
          {/* Hair highlights */}
          <div className="absolute top-[10%] left-[15%] w-4 h-12 rounded-full bg-gradient-to-b from-purple-400/40 to-transparent rotate-[-20deg]" />
          <div className="absolute top-[15%] right-[20%] w-3 h-10 rounded-full bg-gradient-to-b from-purple-400/30 to-transparent rotate-[15deg]" />
          
          {/* Side hair strands */}
          <div
            className="absolute top-[60%] -left-[5%] w-6 h-20 rounded-b-full"
            style={{
              background: 'linear-gradient(180deg, #6d28d9 0%, #5b21b6 100%)',
            }}
          />
          <div
            className="absolute top-[60%] -right-[5%] w-6 h-20 rounded-b-full"
            style={{
              background: 'linear-gradient(180deg, #6d28d9 0%, #5b21b6 100%)',
            }}
          />
          
          {/* Bangs */}
          <div
            className="absolute top-[50%] left-[10%] w-10 h-8 rounded-b-[50%]"
            style={{
              background: 'linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%)',
            }}
          />
        </motion.div>

        {/* Celebration confetti */}
        {mood === 'celebration' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'][i % 5],
                  left: `${10 + (i * 7)}%`,
                  top: '-10%'
                }}
                animate={{
                  y: ['0%', '500%'],
                  x: [0, (i % 2 === 0 ? 20 : -20)],
                  rotate: [0, 360],
                  opacity: [1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeIn"
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

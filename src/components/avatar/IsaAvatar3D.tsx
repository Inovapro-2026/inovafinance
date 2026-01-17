import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import isaAvatarImg from '@/assets/isa-avatar.png';

type AvatarMood = 'idle' | 'listening' | 'thinking' | 'happy' | 'serious' | 'angry' | 'celebration';

interface IsaAvatar3DProps {
  mood?: AvatarMood;
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function IsaAvatar3D({ mood = 'idle', isSpeaking = false, size = 'lg' }: IsaAvatar3DProps) {
  const [pulseScale, setPulseScale] = useState(1);

  // Speaking animation
  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setPulseScale(1 + Math.random() * 0.03);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setPulseScale(1);
    }
  }, [isSpeaking]);

  const sizeConfig = {
    sm: { width: 80, height: 100 },
    md: { width: 120, height: 150 },
    lg: { width: 160, height: 200 }
  };

  const { width, height } = sizeConfig[size];

  const getMoodAnimation = () => {
    switch (mood) {
      case 'happy':
      case 'celebration':
        return { 
          scale: [1, 1.05, 1],
          rotate: [0, 2, -2, 0],
          y: [0, -5, 0]
        };
      case 'serious':
        return { 
          scale: 1,
          rotate: [0, -2, 0],
          y: 0
        };
      case 'angry':
        return { 
          scale: 1,
          rotate: [0, -3, 3, 0],
          y: 0
        };
      case 'listening':
        return { 
          scale: 1,
          rotate: [0, 5, 0],
          y: [0, -3, 0]
        };
      case 'thinking':
        return { 
          scale: 1,
          rotate: [0, 3, 0],
          y: 0
        };
      default:
        return { 
          scale: 1,
          rotate: 0,
          y: [0, -2, 0]
        };
    }
  };

  const getGlowColor = () => {
    switch (mood) {
      case 'happy':
      case 'celebration':
        return 'rgba(52, 211, 153, 0.4)';
      case 'serious':
      case 'angry':
        return 'rgba(248, 113, 113, 0.3)';
      case 'listening':
        return 'rgba(96, 165, 250, 0.4)';
      default:
        return 'rgba(236, 72, 153, 0.3)';
    }
  };

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width, height }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute rounded-full blur-2xl"
        style={{
          width: width * 1.2,
          height: width * 1.2,
          background: `radial-gradient(circle, ${getGlowColor()} 0%, transparent 70%)`
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.4, 0.7, 0.4]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Speaking rings */}
      {isSpeaking && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 border-pink-400/40"
              style={{
                width: width * 0.8,
                height: width * 0.8,
              }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5 + i * 0.3, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: "easeOut"
              }}
            />
          ))}
        </>
      )}

      {/* Avatar Container */}
      <motion.div
        className="relative z-10"
        animate={getMoodAnimation()}
        transition={{
          duration: mood === 'idle' ? 3 : 0.8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Main Avatar Image */}
        <motion.div
          className="relative overflow-hidden rounded-full"
          style={{
            width: width * 0.95,
            height: height * 0.95,
          }}
          animate={{
            scale: pulseScale,
          }}
          transition={{ duration: 0.15 }}
        >
          <img
            src={isaAvatarImg}
            alt="ISA Avatar"
            className="w-full h-full object-cover object-top"
            style={{
              filter: mood === 'serious' || mood === 'angry' 
                ? 'saturate(0.8) brightness(0.95)' 
                : mood === 'happy' || mood === 'celebration'
                ? 'saturate(1.1) brightness(1.05)'
                : 'none'
            }}
          />
          
          {/* Overlay effects based on mood */}
          {(mood === 'happy' || mood === 'celebration') && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-emerald-400/10 to-transparent"
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          
          {(mood === 'serious' || mood === 'angry') && (
            <div className="absolute inset-0 bg-gradient-to-t from-red-400/10 to-transparent" />
          )}

          {mood === 'listening' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-blue-400/10 to-transparent"
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Speaking indicator */}
        {isSpeaking && (
          <motion.div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-pink-400 rounded-full"
                animate={{
                  height: [4, 12, 4],
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* Celebration confetti */}
      {mood === 'celebration' && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'][i % 5],
                left: `${20 + (i % 6) * 12}%`,
                top: '-10%'
              }}
              animate={{
                y: [0, height * 1.5],
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
    </div>
  );
}

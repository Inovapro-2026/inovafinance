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

  const sizeConfig = {
    sm: { width: 80, height: 100 },
    md: { width: 120, height: 150 },
    lg: { width: 160, height: 200 }
  };

  const { width, height } = sizeConfig[size];

  const getMoodStyles = () => {
    switch (mood) {
      case 'happy':
      case 'celebration':
        return { eyeScale: 1.1, mouthCurve: 12, blush: true, eyebrowY: -2 };
      case 'serious':
        return { eyeScale: 0.9, mouthCurve: 0, blush: false, eyebrowY: 2 };
      case 'angry':
        return { eyeScale: 0.85, mouthCurve: -4, blush: false, eyebrowY: 4 };
      case 'listening':
        return { eyeScale: 1.05, mouthCurve: 2, blush: false, eyebrowY: -1 };
      case 'thinking':
        return { eyeScale: 1, mouthCurve: 1, blush: false, eyebrowY: 0 };
      default:
        return { eyeScale: 1, mouthCurve: 6, blush: false, eyebrowY: 0 };
    }
  };

  const moodStyles = getMoodStyles();

  return (
    <div 
      className="relative"
      style={{ width, height }}
    >
      {/* Ambient glow */}
      <motion.div
        className="absolute rounded-full blur-2xl"
        style={{
          width: width * 0.8,
          height: width * 0.8,
          left: '10%',
          top: '20%',
          background: mood === 'happy' || mood === 'celebration' 
            ? 'radial-gradient(circle, rgba(52,211,153,0.4) 0%, transparent 70%)' 
            : mood === 'angry' || mood === 'serious'
            ? 'radial-gradient(circle, rgba(248,113,113,0.3) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(167,139,250,0.4) 0%, transparent 70%)'
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <svg
        viewBox="0 0 200 250"
        width={width}
        height={height}
        className="relative z-10"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fdf2f8" />
            <stop offset="50%" stopColor="#fce7f3" />
            <stop offset="100%" stopColor="#fbcfe8" />
          </linearGradient>
          
          <linearGradient id="hairGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
          
          <linearGradient id="shirtGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>

          <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>

          {/* Shadows */}
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15"/>
          </filter>
        </defs>

        {/* Body/Shoulders */}
        <motion.g
          animate={{
            y: mood === 'celebration' ? [0, -3, 0] : 0
          }}
          transition={{
            duration: 0.5,
            repeat: mood === 'celebration' ? Infinity : 0
          }}
        >
          <ellipse
            cx="100"
            cy="230"
            rx="75"
            ry="45"
            fill="url(#shirtGradient)"
            filter="url(#softShadow)"
          />
          {/* Shoulder highlights */}
          <ellipse
            cx="55"
            cy="215"
            rx="15"
            ry="8"
            fill="rgba(255,255,255,0.15)"
          />
          <ellipse
            cx="145"
            cy="215"
            rx="15"
            ry="8"
            fill="rgba(255,255,255,0.15)"
          />
          {/* Neckline */}
          <path
            d="M 85 190 Q 100 200 115 190"
            fill="none"
            stroke="#fce7f3"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </motion.g>

        {/* Neck */}
        <rect
          x="88"
          y="155"
          width="24"
          height="40"
          rx="12"
          fill="url(#skinGradient)"
        />

        {/* Head */}
        <motion.g
          animate={{
            rotate: mood === 'listening' ? -3 : mood === 'thinking' ? 3 : 0,
            y: isSpeaking ? [0, -1, 0] : 0
          }}
          transition={{
            rotate: { duration: 0.3 },
            y: { duration: 0.15, repeat: isSpeaking ? Infinity : 0 }
          }}
          style={{ transformOrigin: '100px 100px' }}
        >
          {/* Face */}
          <ellipse
            cx="100"
            cy="95"
            rx="55"
            ry="65"
            fill="url(#skinGradient)"
            filter="url(#softShadow)"
          />

          {/* Ears */}
          <ellipse cx="45" cy="100" rx="8" ry="12" fill="#fce7f3" />
          <ellipse cx="155" cy="100" rx="8" ry="12" fill="#fce7f3" />

          {/* Hair Back */}
          <ellipse
            cx="100"
            cy="55"
            rx="58"
            ry="45"
            fill="url(#hairGradient)"
          />

          {/* Hair Front/Bangs */}
          <path
            d="M 50 70 Q 55 35 100 30 Q 145 35 150 70 Q 140 55 100 50 Q 60 55 50 70"
            fill="url(#hairGradient)"
          />
          
          {/* Side Hair */}
          <path
            d="M 42 65 Q 35 90 40 130 Q 45 135 50 120 Q 48 90 50 70 Z"
            fill="url(#hairGradient)"
          />
          <path
            d="M 158 65 Q 165 90 160 130 Q 155 135 150 120 Q 152 90 150 70 Z"
            fill="url(#hairGradient)"
          />

          {/* Hair highlights */}
          <path
            d="M 70 40 Q 75 55 72 70"
            stroke="rgba(167,139,250,0.5)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 120 38 Q 125 50 122 62"
            stroke="rgba(167,139,250,0.4)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Eyebrows */}
          <motion.path
            d="M 68 72 Q 78 69 88 72"
            stroke="#6d28d9"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            animate={{
              d: mood === 'angry' 
                ? "M 68 68 Q 78 74 88 72"
                : mood === 'happy' || mood === 'celebration'
                ? "M 68 74 Q 78 68 88 72"
                : "M 68 72 Q 78 69 88 72"
            }}
          />
          <motion.path
            d="M 112 72 Q 122 69 132 72"
            stroke="#6d28d9"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            animate={{
              d: mood === 'angry' 
                ? "M 112 72 Q 122 74 132 68"
                : mood === 'happy' || mood === 'celebration'
                ? "M 112 72 Q 122 68 132 74"
                : "M 112 72 Q 122 69 132 72"
            }}
          />

          {/* Eyes */}
          <motion.g
            animate={{
              scaleY: blinkState ? 0.1 : moodStyles.eyeScale,
              scaleX: moodStyles.eyeScale
            }}
            transition={{ duration: 0.1 }}
            style={{ transformOrigin: '78px 88px' }}
          >
            <ellipse
              cx="78"
              cy="88"
              rx="10"
              ry="12"
              fill="url(#eyeGradient)"
            />
            {/* Eye shine */}
            <circle cx="74" cy="84" r="4" fill="white" opacity="0.9" />
            <circle cx="81" cy="90" r="2" fill="white" opacity="0.5" />
          </motion.g>

          <motion.g
            animate={{
              scaleY: blinkState ? 0.1 : moodStyles.eyeScale,
              scaleX: moodStyles.eyeScale
            }}
            transition={{ duration: 0.1 }}
            style={{ transformOrigin: '122px 88px' }}
          >
            <ellipse
              cx="122"
              cy="88"
              rx="10"
              ry="12"
              fill="url(#eyeGradient)"
            />
            {/* Eye shine */}
            <circle cx="118" cy="84" r="4" fill="white" opacity="0.9" />
            <circle cx="125" cy="90" r="2" fill="white" opacity="0.5" />
          </motion.g>

          {/* Blush (when happy) */}
          {moodStyles.blush && (
            <>
              <motion.ellipse
                cx="60"
                cy="105"
                rx="12"
                ry="6"
                fill="#f9a8d4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
              />
              <motion.ellipse
                cx="140"
                cy="105"
                rx="12"
                ry="6"
                fill="#f9a8d4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
              />
            </>
          )}

          {/* Nose */}
          <ellipse
            cx="100"
            cy="108"
            rx="4"
            ry="5"
            fill="#fbbf24"
            opacity="0.15"
          />

          {/* Mouth */}
          <motion.path
            d={`M 85 125 Q 100 ${125 + moodStyles.mouthCurve} 115 125`}
            stroke="#db2777"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            animate={{
              d: isSpeaking 
                ? `M 85 125 Q 100 ${125 + 8 + mouthOpen * 12} 115 125`
                : `M 85 125 Q 100 ${125 + moodStyles.mouthCurve} 115 125`
            }}
          />
          
          {/* Open mouth when speaking or very happy */}
          {(isSpeaking || mood === 'happy' || mood === 'celebration') && (
            <motion.ellipse
              cx="100"
              cy={128 + moodStyles.mouthCurve / 2}
              rx="12"
              ry={isSpeaking ? 4 + mouthOpen * 8 : 5}
              fill="#db2777"
              animate={{
                ry: isSpeaking ? [4, 8, 4] : 5
              }}
              transition={{
                duration: 0.15,
                repeat: isSpeaking ? Infinity : 0
              }}
            />
          )}
        </motion.g>

        {/* Celebration confetti */}
        {mood === 'celebration' && (
          <g>
            {[...Array(8)].map((_, i) => (
              <motion.circle
                key={i}
                cx={30 + i * 20}
                cy={0}
                r="4"
                fill={['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'][i % 5]}
                animate={{
                  cy: [0, 280],
                  cx: [30 + i * 20, 30 + i * 20 + (i % 2 === 0 ? 15 : -15)],
                  opacity: [1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeIn"
                }}
              />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}

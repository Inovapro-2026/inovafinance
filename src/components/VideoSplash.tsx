import { useRef, useEffect } from 'react';
import introVideo from '@/assets/intro-video.mp4';

interface VideoSplashProps {
  onComplete: () => void;
}

export function VideoSplash({ onComplete }: VideoSplashProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Auto-play video
    video.play().catch(console.error);

    // When video ends, call onComplete
    const handleEnded = () => {
      onComplete();
    };

    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('ended', handleEnded);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={introVideo}
        className="w-full h-full object-cover"
        playsInline
        autoPlay
      />
    </div>
  );
}

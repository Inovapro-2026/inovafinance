import { useRef, useEffect } from 'react';
import introVideo from '@/assets/intro-video.mp4';
import introAudio from '@/assets/intro-audio.mp3';

interface VideoSplashProps {
  onComplete: () => void;
}

export function VideoSplash({ onComplete }: VideoSplashProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;

    // Auto-play video and audio together
    const playMedia = async () => {
      try {
        await Promise.all([video.play(), audio.play()]);
      } catch (error) {
        console.error('Error playing media:', error);
      }
    };

    playMedia();

    // When video ends, stop audio and call onComplete
    const handleEnded = () => {
      audio.pause();
      audio.currentTime = 0;
      onComplete();
    };

    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={introVideo}
        className="w-full h-full object-cover"
        muted
        playsInline
        autoPlay
      />
      <audio ref={audioRef} src={introAudio} />
    </div>
  );
}

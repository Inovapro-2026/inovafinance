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
        // If autoplay fails, go to login after a short delay
        setTimeout(onComplete, 1000);
      }
    };

    playMedia();

    // When AUDIO ends, stop video and call onComplete
    const handleAudioEnded = () => {
      video.pause();
      onComplete();
    };

    // Loop video if it ends before audio
    const handleVideoEnded = () => {
      if (audio && !audio.ended) {
        video.currentTime = 0;
        video.play().catch(console.error);
      }
    };

    audio.addEventListener('ended', handleAudioEnded);
    video.addEventListener('ended', handleVideoEnded);

    return () => {
      audio.removeEventListener('ended', handleAudioEnded);
      video.removeEventListener('ended', handleVideoEnded);
      audio.pause();
      video.pause();
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={introVideo}
        className="min-w-full min-h-full w-auto h-auto object-cover absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        muted
        playsInline
        autoPlay
        loop={false}
      />
      <audio ref={audioRef} src={introAudio} />
    </div>
  );
}

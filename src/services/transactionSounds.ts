// Transaction sound effects using Web Audio API
import { stopAllAudio } from '@/services/audioManager';

class TransactionSoundService {
  private audioContext: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Payment beep sound for expenses
  playExpenseSound(): void {
    try {
      // Stop any other audio first
      stopAllAudio();
      
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Two-tone beep (like card machine)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1174, ctx.currentTime + 0.1); // D6

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);

      // Second beep for confirmation
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318, ctx.currentTime); // E6
        gain2.gain.setValueAtTime(0.25, ctx.currentTime);
        gain2.gain.setValueAtTime(0.01, ctx.currentTime + 0.15);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.15);
      }, 200);

    } catch (error) {
      console.log('Could not play expense sound:', error);
    }
  }

  // Cash/coin sound for income
  playIncomeSound(): void {
    try {
      // Stop any other audio first
      stopAllAudio();
      
      const ctx = this.getAudioContext();

      // Multiple tones to simulate coins/cash
      const frequencies = [523, 659, 784, 1047]; // C5, E5, G5, C6 (major chord)
      
      frequencies.forEach((freq, index) => {
        setTimeout(() => {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.01, ctx.currentTime + 0.3);

          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
        }, index * 80);
      });

      // Add a final "bling" effect
      setTimeout(() => {
        const finalOsc = ctx.createOscillator();
        const finalGain = ctx.createGain();
        finalOsc.connect(finalGain);
        finalGain.connect(ctx.destination);
        finalOsc.type = 'triangle';
        finalOsc.frequency.setValueAtTime(2093, ctx.currentTime); // C7 (high)
        finalGain.gain.setValueAtTime(0.15, ctx.currentTime);
        finalGain.gain.setValueAtTime(0.01, ctx.currentTime + 0.4);
        finalOsc.start(ctx.currentTime);
        finalOsc.stop(ctx.currentTime + 0.4);
      }, 350);

    } catch (error) {
      console.log('Could not play income sound:', error);
    }
  }
}

export const transactionSounds = new TransactionSoundService();

import * as React from 'react';

export function useAudioAlert() {
  const contextRef = React.useRef<AudioContext | null>(null);

  const playBeep = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!contextRef.current) {
      contextRef.current = new AudioContext();
    }
    const ctx = contextRef.current;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.6);
  }, []);

  return { playBeep };
}

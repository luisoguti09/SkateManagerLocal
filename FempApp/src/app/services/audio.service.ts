import { Injectable } from '@angular/core';

type SoundKey = 'scanner' | 'success' | 'error';

@Injectable({ providedIn: 'root' })
export class AudioService {

  private cache = new Map<SoundKey, HTMLAudioElement>();
  private paths: Record<SoundKey, string> = {
    scanner: 'assets/sounds/scanner-beep.mp3',
    success: 'assets/sounds/success-sound.mp3',
    error:   'assets/sounds/error-fail.mp3',
  };

  public play(key: SoundKey) {
    const el = this.getAudio(key);
    el.currentTime = 0;
    el.play().catch(() => this.webBeepFallback(key));
  }

  private getAudio(key: SoundKey): HTMLAudioElement {
    if (!this.cache.has(key)) {
      const el = new Audio(this.paths[key]);
      el.preload = 'auto';
      el.volume = key === 'error' ? 0.9 : 0.6; // un toque más fuerte el error
      this.cache.set(key, el);
    }
    return this.cache.get(key)!;
  }

  /** Fallback: si el MP3 falta/falla, WebAudio tira un beep */
  private webBeepFallback(key: SoundKey) {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Timbres distintos por evento
    const freq = key === 'scanner' ? 880 : key === 'success' ? 1200 : 320;
    const dur  = key === 'error' ? 0.18 : 0.11;
    osc.type = key === 'error' ? 'sawtooth' : 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);

    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }
  
}

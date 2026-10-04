/**
 * Détecteur acoustique de double-claque (Double Clap Detection) pour JARVIS
 * Analyse le signal du microphone via l'API Web Audio pour détecter deux claquements de mains
 * rapprochés (200ms - 850ms) avec profil transitoire tranché.
 */

import { playClapAck, playArcReactorWake } from './audio-effects';

export interface ClapDetectorOptions {
  onDoubleClap: () => void;
  onSingleClap?: () => void;
  threshold?: number; // Seuil d'amplitude (0 à 1, défaut 0.35)
  minInterval?: number; // ms entre deux claques (défaut 180ms)
  maxInterval?: number; // ms max entre deux claques (défaut 850ms)
  enabled?: boolean;
}

export class DoubleClapDetector {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  private lastClapTime: number = 0;
  private cooldownUntil: number = 0;
  private options: Required<ClapDetectorOptions>;

  constructor(options: ClapDetectorOptions) {
    this.options = {
      onDoubleClap: options.onDoubleClap,
      onSingleClap: options.onSingleClap || (() => {}),
      threshold: options.threshold ?? 0.32,
      minInterval: options.minInterval ?? 180,
      maxInterval: options.maxInterval ?? 850,
      enabled: options.enabled ?? true,
    };
  }

  public setEnabled(enabled: boolean) {
    this.options.enabled = enabled;
    if (!enabled && this.isRunning) {
      this.stop();
    } else if (enabled && !this.isRunning) {
      this.start();
    }
  }

  public async start(): Promise<boolean> {
    if (this.isRunning) return true;
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      console.warn('[CLAP] getUserMedia non supporté par ce navigateur');
      return false;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.1; // Très réactif aux transitoires

      this.sourceNode.connect(this.analyser);
      this.isRunning = true;

      this.loop();
      console.log('[CLAP DETECTOR] 👏 Surveillance acoustique double-claque active');
      return true;
    } catch (err) {
      console.warn('[CLAP DETECTOR] Impossible d\'accéder au microphone pour la détection acoustique:', err);
      this.isRunning = false;
      return false;
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch (e) {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try { this.audioCtx.close(); } catch (e) {}
      this.audioCtx = null;
    }
    console.log('[CLAP DETECTOR] Arrêt de la surveillance acoustique');
  }

  private loop = () => {
    if (!this.isRunning || !this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(dataArray);

    // Calculer le pic absolu par rapport au centre 128
    let maxDeviation = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const dev = Math.abs(dataArray[i] - 128);
      if (dev > maxDeviation) {
        maxDeviation = dev;
      }
    }

    const normalizedEnergy = maxDeviation / 128; // 0.0 à 1.0
    const now = Date.now();

    if (normalizedEnergy >= this.options.threshold && now > this.cooldownUntil) {
      const delta = now - this.lastClapTime;

      if (delta >= this.options.minInterval && delta <= this.options.maxInterval) {
        // Deuxième claque dans la fenêtre temporelle exacte (ex: 200ms - 850ms)
        console.log(`[CLAP DETECTOR] ⚡ DOUBLE CLAQUE DÉTECTÉE ! (Delta: ${delta}ms, Énergie: ${(normalizedEnergy * 100).toFixed(0)}%)`);
        this.lastClapTime = 0;
        this.cooldownUntil = now + 1500; // Cooldown 1.5s pour éviter tout faux rebond

        playArcReactorWake();
        this.options.onDoubleClap();
      } else {
        // Première claque isolée
        this.lastClapTime = now;
        this.cooldownUntil = now + this.options.minInterval; // Cooldown court pour ne pas compter le même son deux fois
        playClapAck();
        this.options.onSingleClap?.();
      }
    }

    // Réinitialiser si le délai max d'attente de la deuxième claque a expiré
    if (this.lastClapTime > 0 && now - this.lastClapTime > this.options.maxInterval) {
      this.lastClapTime = 0;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}

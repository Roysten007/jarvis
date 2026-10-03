'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Zap, Volume2, Shield } from 'lucide-react';
import { playMicOpen, playHudReceive, playHudTransmit } from '@/lib/audio-effects';

export interface ArcReactorWakeProps {
  onCommandReceived: (command: string) => void;
  isProcessing: boolean;
  isSpeaking?: boolean;
  activeStatusText?: string;
  compact?: boolean;
  isMaster?: boolean; // Seul le réacteur maître gère l'instance SpeechRecognition
  isAwakeExternal?: boolean;
  onTapWakeExternal?: () => void;
  onAwakeChange?: (awake: boolean) => void;
  isVoiceInputActive?: boolean; // Pause le wake listener si l'utilisateur parle manuellement au micro
}

export function ArcReactorWake({
  onCommandReceived,
  isProcessing,
  isSpeaking = false,
  activeStatusText,
  compact = false,
  isMaster = true,
  isAwakeExternal,
  onTapWakeExternal,
  onAwakeChange,
  isVoiceInputActive = false,
}: ArcReactorWakeProps) {
  const [internalAwake, setInternalAwake] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);

  const isAwake = isMaster ? internalAwake : (isAwakeExternal ?? false);
  const isAwakeRef = useRef(false);
  const isBusyRef = useRef(false);
  const isListeningRef = useRef(false);
  const awakeTimeoutRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Mettre à jour l'état occupé pour bloquer l'écho micro
  useEffect(() => {
    isBusyRef.current = isProcessing || isSpeaking || isVoiceInputActive;
  }, [isProcessing, isSpeaking, isVoiceInputActive]);

  // Synchroniser isAwakeRef et informer le parent
  const updateAwake = (awake: boolean) => {
    setInternalAwake(awake);
    isAwakeRef.current = awake;
    if (onAwakeChange) onAwakeChange(awake);
  };

  // Synchroniser quand le parent ou un tap externe active l'éveil
  useEffect(() => {
    if (isAwakeExternal !== undefined && isAwakeExternal !== isAwakeRef.current) {
      setInternalAwake(isAwakeExternal);
      isAwakeRef.current = isAwakeExternal;
      if (isAwakeExternal) {
        playMicOpen();
        setInterimText('À votre écoute...');
        if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
        awakeTimeoutRef.current = setTimeout(() => {
          updateAwake(false);
          setInterimText('');
        }, 8000);
      } else {
        setInterimText('');
        if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
      }
    }
  }, [isAwakeExternal]);

  // Seul le composant maître (dans le Header) instancie SpeechRecognition
  useEffect(() => {
    if (!isMaster || typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    let recognition: any = null;
    let isDestroyed = false;

    const startRecognition = () => {
      if (isDestroyed || isVoiceInputActive) return;

      try {
        if (!recognition) {
          recognition = new SpeechRecognition();
          recognition.lang = 'fr-FR';
          recognition.continuous = true;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            // RÈGLE CRITIQUE ANTI-BOUCLE : Ignorer complètement les sons si JARVIS parle ou travaille
            if (isBusyRef.current) return;

            let fullTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              fullTranscript += event.results[i][0].transcript;
            }

            const textLower = fullTranscript.toLowerCase().trim();
            if (!textLower) return;

            // Détection du mot de réveil "Jarvis", "Dis Jarvis" ou "Réveille-toi"
            const wakeMatch = textLower.match(/(?:dis\s+)?jarvis|réveille-toi|debout/i);

            if (wakeMatch) {
              const parts = textLower.split(/jarvis/i);
              const command = parts.length > 1 ? parts.slice(1).join(' ').trim() : '';

              // Si une commande concrète est déjà prononcée dans la même phrase
              if (command.length > 2 && event.results[event.results.length - 1].isFinal) {
                playHudTransmit();
                onCommandReceived(command);
                updateAwake(false);
                setInterimText('');
                if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
                return;
              }

              // Juste le mot de réveil : passer en état d'écoute active pour 8 secondes
              updateAwake(true);
              playMicOpen();
              setInterimText('À votre écoute...');

              if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
              awakeTimeoutRef.current = setTimeout(() => {
                updateAwake(false);
                setInterimText('');
              }, 8000);
            } else if (isAwakeRef.current && event.results[event.results.length - 1].isFinal) {
              // L'utilisateur était réveillé et vient de prononcer son ordre
              if (fullTranscript.trim().length > 2) {
                if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
                playHudTransmit();
                onCommandReceived(fullTranscript.trim());
                updateAwake(false);
                setInterimText('');
              }
            } else if (isAwakeRef.current) {
              // Affichage en temps réel de ce que l'utilisateur est en train de dicter
              setInterimText(fullTranscript);
            }
            // S'il n'est pas réveillé et qu'aucun mot de réveil n'est dit : IGNORER SILENCIEUSEMENT
          };

          recognition.onerror = (err: any) => {
            if (err.error === 'not-allowed' || err.error === 'audio-capture') {
              console.warn('[ARC REACTOR] Permission micro refusée ou indisponible');
              isListeningRef.current = false;
            }
          };

          recognition.onend = () => {
            isListeningRef.current = false;
            if (!isDestroyed && !isVoiceInputActive) {
              // Redémarrage automatique propre avec un délai tampon pour ne pas saturer le micro
              setTimeout(() => {
                if (!isDestroyed && !isVoiceInputActive && !isListeningRef.current) {
                  try {
                    recognition.start();
                    isListeningRef.current = true;
                  } catch (e) {}
                }
              }, 400);
            }
          };

          recognitionRef.current = recognition;
        }

        if (!isListeningRef.current) {
          recognition.start();
          isListeningRef.current = true;
        }
      } catch (e) {
        console.warn('[ARC REACTOR] Erreur démarrage écoute:', e);
      }
    };

    // Si le micro manuel de l'input est actif, libérer immédiatement le micro
    if (isVoiceInputActive) {
      if (recognition && isListeningRef.current) {
        try {
          recognition.stop();
        } catch (e) {}
        isListeningRef.current = false;
      }
    } else {
      startRecognition();
    }

    return () => {
      isDestroyed = true;
      if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {}
        isListeningRef.current = false;
      }
    };
  }, [isMaster, onCommandReceived, isVoiceInputActive]);

  // Réveil tactile (1 Tap sur le réacteur)
  const handleTapWake = () => {
    if (!isMaster && onTapWakeExternal) {
      onTapWakeExternal();
      return;
    }

    if (isBusyRef.current) return;

    if (isAwake) {
      // Deuxième tap : éteindre
      updateAwake(false);
      setInterimText('');
      if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
    } else {
      // Premier tap : réveiller
      updateAwake(true);
      playMicOpen();
      setInterimText('À votre écoute...');

      if (awakeTimeoutRef.current) clearTimeout(awakeTimeoutRef.current);
      awakeTimeoutRef.current = setTimeout(() => {
        updateAwake(false);
        setInterimText('');
      }, 8000);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 select-none">
        <button
          type="button"
          onClick={handleTapWake}
          title="Dites 'JARVIS' ou touchez pour ordonner sans clavier"
          className={`flex items-center gap-2 px-2.5 py-1 rounded-full border transition-all ${
            isAwake
              ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-hud-amber animate-pulse'
              : isSpeaking
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-hud-emerald animate-pulse'
              : isProcessing
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-hud-cyan animate-pulse'
              : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-900/30'
          }`}
        >
          <div className="relative w-3.5 h-3.5 rounded-full border border-cyan-400/50 flex items-center justify-center">
            <div
              className={`w-2 h-2 rounded-full ${
                isAwake
                  ? 'bg-amber-400 animate-ping'
                  : isSpeaking
                  ? 'bg-emerald-400 animate-pulse'
                  : isProcessing
                  ? 'bg-cyan-400 animate-ping'
                  : 'bg-cyan-400'
              }`}
            />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider">
            {isAwake
              ? 'JARVIS À L\'ÉCOUTE'
              : isSpeaking
              ? 'JARVIS PARLE...'
              : isProcessing
              ? 'EXÉCUTION...'
              : 'WAKE: "JARVIS"'}
          </span>
        </button>
        {interimText && (
          <span className="text-[10px] text-cyan-300 italic truncate max-w-[140px] hidden sm:inline">
            "{interimText}"
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 select-none">
      {/* Réacteur Arc Réactif */}
      <div
        onClick={handleTapWake}
        title="Dites 'JARVIS' ou touchez pour commander"
        className={`relative w-28 h-28 md:w-32 md:h-32 rounded-full cursor-pointer flex items-center justify-center transition-all duration-500 ${
          isAwake || isProcessing || isSpeaking
            ? 'scale-105 shadow-[0_0_50px_rgba(0,240,255,0.6)] border-2 border-cyan-300'
            : 'hover:scale-102 shadow-hud-cyan border border-cyan-500/30'
        } bg-[#040817]`}
      >
        {/* Anneau extérieur rotatif */}
        <div
          className={`absolute inset-0 rounded-full border border-dashed border-cyan-400/40 ${
            isAwake || isProcessing || isSpeaking ? 'animate-spin' : 'animate-spin-slow'
          }`}
        />

        {/* Noyau central du réacteur */}
        <div
          className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all ${
            isAwake
              ? 'bg-amber-400/30 border-2 border-amber-300 shadow-hud-amber animate-pulse'
              : isSpeaking
              ? 'bg-emerald-400/30 border-2 border-emerald-300 shadow-hud-emerald animate-pulse'
              : isProcessing
              ? 'bg-cyan-400/30 border-2 border-cyan-300 shadow-hud-cyan animate-ping'
              : 'bg-cyan-950/60 border border-cyan-400/40'
          }`}
        >
          {isAwake ? (
            <Mic className="w-6 h-6 text-amber-300 animate-bounce" />
          ) : isSpeaking ? (
            <Volume2 className="w-6 h-6 text-emerald-300 animate-pulse" />
          ) : isProcessing ? (
            <Zap className="w-6 h-6 text-cyan-300 animate-pulse" />
          ) : (
            <Shield className="w-6 h-6 text-cyan-400" />
          )}
        </div>
      </div>

      {/* État textuel et transcription */}
      <div className="mt-3 text-center font-mono">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
          <span
            className={`w-2 h-2 rounded-full ${
              isAwake
                ? 'bg-amber-400 animate-ping'
                : isSpeaking
                ? 'bg-emerald-400 animate-pulse'
                : isProcessing
                ? 'bg-cyan-400 animate-pulse'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-cyan-300 tracking-wider">
            {isAwake
              ? 'JARVIS EST RÉVEILLÉ // À VOS ORDRES'
              : isSpeaking
              ? 'JARVIS PARLE...'
              : isProcessing
              ? 'EXÉCUTION EN COURS...'
              : 'VEILLE ACTIVE // DITES "JARVIS" OU TOUCHEZ'}
          </span>
        </div>

        {interimText && (
          <p className="text-[11px] text-cyan-200 font-sans mt-1 max-w-xs truncate italic">
            "{interimText}"
          </p>
        )}

        {activeStatusText && !interimText && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            {activeStatusText}
          </p>
        )}
      </div>
    </div>
  );
}

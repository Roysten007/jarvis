'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Zap, Volume2, Shield } from 'lucide-react';
import { playMicOpen, playHudReceive, playHudTransmit } from '@/lib/audio-effects';

interface ArcReactorWakeProps {
  onCommandReceived: (command: string) => void;
  isProcessing: boolean;
  activeStatusText?: string;
}

export function ArcReactorWake({
  onCommandReceived,
  isProcessing,
  activeStatusText,
}: ArcReactorWakeProps) {
  const [isAwake, setIsAwake] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);

  // Initialisation de l'écoute continue du Wake Word "Jarvis"
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let fullTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }

      const textLower = fullTranscript.toLowerCase();
      setInterimText(fullTranscript);

      // Détection du mot de réveil "Jarvis" ou "Dis Jarvis" ou "Réveille-toi"
      const wakeMatch = textLower.match(/(?:dis\s+)?jarvis|réveille-toi|debout/i);

      if (wakeMatch) {
        setIsAwake(true);
        playMicOpen();

        // Extraire la commande après le mot Jarvis s'il y en a une
        const parts = textLower.split(/jarvis/i);
        const command = parts.length > 1 ? parts.slice(1).join(' ').trim() : '';

        // Si une commande concrète est déjà prononcée
        if (command.length > 5 && event.results[event.results.length - 1].isFinal) {
          playHudTransmit();
          onCommandReceived(command);
          setInterimText('');
          setIsAwake(false);
        }
      } else if (isListeningRef.current && event.results[event.results.length - 1].isFinal) {
        // Si l'utilisateur a tapé pour réveiller et finit sa phrase
        if (fullTranscript.trim().length > 2) {
          playHudTransmit();
          onCommandReceived(fullTranscript.trim());
          setInterimText('');
          setIsAwake(false);
        }
      }
    };

    recognition.onend = () => {
      // Reconnexion automatique pour écoute continue
      try {
        if (isListeningRef.current) {
          recognition.start();
        }
      } catch (e) {}
    };

    try {
      recognition.start();
      isListeningRef.current = true;
    } catch (e) {}

    recognitionRef.current = recognition;

    return () => {
      isListeningRef.current = false;
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [onCommandReceived]);

  // Réveil tactile (1 Tap sur le réacteur)
  const handleTapWake = () => {
    setIsAwake(true);
    playMicOpen();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          recognitionRef.current.start();
        }, 150);
      } catch (e) {}
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 select-none">
      {/* Réacteur Arc Réactif */}
      <div
        onClick={handleTapWake}
        title="Dites 'JARVIS' ou touchez pour commander"
        className={`relative w-28 h-28 md:w-32 md:h-32 rounded-full cursor-pointer flex items-center justify-center transition-all duration-500 ${
          isAwake || isProcessing
            ? 'scale-105 shadow-[0_0_50px_rgba(0,240,255,0.6)] border-2 border-cyan-300'
            : 'hover:scale-102 shadow-hud-cyan border border-cyan-500/30'
        } bg-[#040817]`}
      >
        {/* Anneau extérieur rotatif */}
        <div
          className={`absolute inset-0 rounded-full border border-dashed border-cyan-400/40 ${
            isAwake || isProcessing ? 'animate-spin' : 'animate-spin-slow'
          }`}
        />

        {/* Noyau central du réacteur */}
        <div
          className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all ${
            isAwake
              ? 'bg-amber-400/30 border-2 border-amber-300 shadow-hud-amber animate-pulse'
              : isProcessing
              ? 'bg-cyan-400/30 border-2 border-cyan-300 shadow-hud-cyan animate-ping'
              : 'bg-cyan-950/60 border border-cyan-400/40'
          }`}
        >
          {isAwake ? (
            <Mic className="w-6 h-6 text-amber-300 animate-bounce" />
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
                : isProcessing
                ? 'bg-cyan-400 animate-pulse'
                : 'bg-emerald-400'
            }`}
          />
          <span className="text-cyan-300 tracking-wider">
            {isAwake
              ? 'JARVIS EST RÉVEILLÉ // À VOS ORDRES'
              : isProcessing
              ? 'EXÉCUTION EN COURS...'
              : 'VEILLE ACTIVE // DITES "JARVIS" OU TOUCHEZ'}
          </span>
        </div>

        {interimText && (
          <p className="text-[11px] text-slate-300 font-sans mt-1 max-w-xs truncate italic">
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

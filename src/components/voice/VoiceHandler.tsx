'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio } from 'lucide-react';

interface VoiceHandlerProps {
  onSpeechResult: (transcript: string) => void;
  isListening: boolean;
  setIsListening: (val: boolean) => void;
  handsFree: boolean;
  setHandsFree: (val: boolean) => void;
  voiceTextToSpeak?: string;
}

export function VoiceHandler({
  onSpeechResult,
  isListening,
  setIsListening,
  handsFree,
  setHandsFree,
  voiceTextToSpeak,
}: VoiceHandlerProps) {
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Initialisation de la reconnaissance vocale
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            onSpeechResult(transcript);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (err: any) => {
          console.warn('[VOICE] Erreur reconnaissance:', err.error);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onSpeechResult, setIsListening]);

  // Basculer l'écoute
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        // Arrêter la synthèse vocale si JARVIS parlait
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Impossible de démarrer la reconnaissance:', e);
      }
    }
  }, [isListening, setIsListening]);

  // Synthèse vocale de JARVIS (Text-to-Speech)
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Annule la parole précédente

    // Nettoyer les balises markdown avant de parler
    const cleanText = text
      .replace(/[*#`_~[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.05; // Débit légèrement dynamique
    utterance.pitch = 0.95; // Ton posé et élégant

    // Recherche d'une voix française naturelle
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(
      (v) => v.lang.startsWith('fr') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Thomas'))
    ) || voices.find((v) => v.lang.startsWith('fr'));

    if (frVoice) {
      utterance.voice = frVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      // Si en mode conversation mains libres, réactiver l'écoute automatiquement
      if (handsFree && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            setIsListening(true);
          } catch (e) {}
        }, 500);
      }
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [handsFree, setIsListening]);

  // Si un texte à prononcer arrive
  useEffect(() => {
    if (voiceTextToSpeak) {
      speak(voiceTextToSpeak);
    }
  }, [voiceTextToSpeak, speak]);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  if (!speechSupported) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      {/* Bouton Micro */}
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? 'Arrêter l\'écoute' : 'Parler à Jarvis (Micro)'}
        className={`p-2 rounded-lg border transition-all flex items-center justify-center ${
          isListening
            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-hud-amber animate-pulse'
            : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400'
        }`}
      >
        {isListening ? <Mic className="w-4 h-4 text-amber-400" /> : <MicOff className="w-4 h-4" />}
      </button>

      {/* Mode Mains Libres */}
      <button
        type="button"
        onClick={() => setHandsFree(!handsFree)}
        title="Mode conversation mains-libres continue"
        className={`p-2 rounded-lg border text-[11px] transition-all flex items-center gap-1.5 ${
          handsFree
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-hud-cyan'
            : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200'
        }`}
      >
        <Radio className={`w-3.5 h-3.5 ${handsFree ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
        <span className="hidden sm:inline">Mains libres</span>
      </button>

      {/* Arrêt Voix Jarvis si en cours de lecture */}
      {isSpeaking && (
        <button
          type="button"
          onClick={stopSpeaking}
          title="Faire taire Jarvis"
          className="p-2 rounded-lg border bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse flex items-center gap-1"
        >
          <VolumeX className="w-4 h-4" />
          <span className="text-[10px] hidden sm:inline">Couper voix</span>
        </button>
      )}
    </div>
  );
}

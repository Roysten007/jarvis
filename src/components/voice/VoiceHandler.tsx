'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Radio, Settings2, Play, Sparkles } from 'lucide-react';
import { playMicOpen, playHudReceive } from '@/lib/audio-effects';

interface VoiceHandlerProps {
  onSpeechResult: (transcript: string) => void;
  isListening: boolean;
  setIsListening: (val: boolean) => void;
  handsFree: boolean;
  setHandsFree: (val: boolean) => void;
  streamChunkToSpeak?: string; // Phrase ou morceau à prononcer immédiatement en flux
}

export function VoiceHandler({
  onSpeechResult,
  isListening,
  setIsListening,
  handsFree,
  setHandsFree,
  streamChunkToSpeak,
}: VoiceHandlerProps) {
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Paramètres vocaux personnalisables
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [pitch, setPitch] = useState<number>(0.92); // Ton élégant et posé
  const [rate, setRate] = useState<number>(1.05); // Débit fluide

  const recognitionRef = useRef<any>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef<boolean>(false);

  // Charger les voix disponibles dans le système
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);

        // Récupérer la voix sauvegardée ou chercher la meilleure voix française
        const savedVoice = localStorage.getItem('jarvis_voice_name');
        const frVoices = available.filter((v) => v.lang.toLowerCase().startsWith('fr'));

        if (savedVoice && frVoices.some((v) => v.name === savedVoice)) {
          setSelectedVoiceName(savedVoice);
        } else if (frVoices.length > 0) {
          // Priorité aux voix françaises naturelles (Henri, Denise, Paul, Thomas, Google, etc.)
          const preferred =
            frVoices.find((v) => /natural|online|henri|denise|paul|thomas|google|hortense/i.test(v.name)) ||
            frVoices[0];

          if (preferred) {
            setSelectedVoiceName(preferred.name);
            localStorage.setItem('jarvis_voice_name', preferred.name);
          }
        } else {
          // Aucune voix française locale détectée : laisser le navigateur utiliser sa voix française native fr-FR
          setSelectedVoiceName('');
          localStorage.removeItem('jarvis_voice_name');
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Charger pitch et rate sauvegardés
    const savedPitch = localStorage.getItem('jarvis_voice_pitch');
    if (savedPitch) setPitch(parseFloat(savedPitch));

    const savedRate = localStorage.getItem('jarvis_voice_rate');
    if (savedRate) setRate(parseFloat(savedRate));
  }, []);

  // Initialisation de la reconnaissance vocale Web Speech
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
            playHudReceive();
            onSpeechResult(transcript);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (err: any) => {
          console.warn('[VOICE] Erreur micro:', err.error);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onSpeechResult, setIsListening]);

  // File d'attente vocale phrase par phrase (Streaming TTS sans latence)
  const processSpeechQueue = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isPlayingQueueRef.current || speechQueueRef.current.length === 0) return;

    const sentence = speechQueueRef.current.shift();
    if (!sentence) return;

    isPlayingQueueRef.current = true;
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = 'fr-FR';
    utterance.rate = rate;
    utterance.pitch = pitch;

    if (selectedVoiceName) {
      const voiceObj = voices.find(
        (v) => v.name === selectedVoiceName && v.lang.toLowerCase().startsWith('fr')
      );
      if (voiceObj) utterance.voice = voiceObj;
    }

    utterance.onend = () => {
      isPlayingQueueRef.current = false;
      if (speechQueueRef.current.length > 0) {
        processSpeechQueue();
      } else {
        setIsSpeaking(false);
        // Si mode mains libres activé, réécouter automatiquement
        if (handsFree && recognitionRef.current) {
          setTimeout(() => {
            try {
              playMicOpen();
              recognitionRef.current.start();
              setIsListening(true);
            } catch (e) {}
          }, 400);
        }
      }
    };

    utterance.onerror = () => {
      isPlayingQueueRef.current = false;
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, [rate, pitch, selectedVoiceName, voices, handsFree, setIsListening]);

  // Ajouter un fragment textuel à la file de parole
  const queueSpeech = useCallback(
    (text: string) => {
      // Nettoyer balises markdown, code et URLs
      const clean = text
        .replace(/[*#`_~[\]()]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\n+/g, ' ')
        .trim();

      if (!clean) return;

      speechQueueRef.current.push(clean);
      processSpeechQueue();
    },
    [processSpeechQueue]
  );

  // Dès qu'un fragment de phrase arrive
  useEffect(() => {
    if (streamChunkToSpeak) {
      queueSpeech(streamChunkToSpeak);
    }
  }, [streamChunkToSpeak, queueSpeech]);

  // Basculer l'écoute
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        speechQueueRef.current = [];
        isPlayingQueueRef.current = false;
        setIsSpeaking(false);
      }

      if (!speechSupported) {
        // Tenter de réinitialiser à la volée ou demander la permission micro
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
          const rec = new SpeechRecognition();
          rec.lang = 'fr-FR';
          rec.continuous = false;
          rec.interimResults = false;
          rec.onresult = (ev: any) => {
            const transcript = ev.results[0][0].transcript;
            if (transcript) {
              playHudReceive();
              onSpeechResult(transcript);
            }
          };
          rec.onend = () => setIsListening(false);
          rec.onerror = () => setIsListening(false);
          recognitionRef.current = rec;
          setSpeechSupported(true);
          try {
            playMicOpen();
            rec.start();
            setIsListening(true);
            return;
          } catch (e) {}
        }

        // Si le navigateur ne supporte pas l'API ou permission refusée
        alert(
          '🎙️ Reconnaissance Vocale JARVIS :\n\n' +
            'Pour parler au microphone, utilisez Google Chrome ou Microsoft Edge et autorisez l\'accès au micro dans la barre d\'adresse (icône cadenas/caméra).'
        );
        return;
      }

      try {
        playMicOpen();
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Erreur start speech:', e);
        setIsListening(false);
      }
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      speechQueueRef.current = [];
      isPlayingQueueRef.current = false;
      setIsSpeaking(false);
    }
  };

  const handleTestVoice = () => {
    stopSpeaking();
    queueSpeech('À vos ordres, Monsieur Roysten. La fréquence vocale de JARVIS est ajustée.');
  };

  const handleSaveSettings = () => {
    localStorage.setItem('jarvis_voice_name', selectedVoiceName);
    localStorage.setItem('jarvis_voice_pitch', pitch.toString());
    localStorage.setItem('jarvis_voice_rate', rate.toString());
    setShowSettings(false);
  };

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs relative">
      {/* Bouton Micro Principal Toujours Visible */}
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? 'Arrêter l\'écoute' : 'Parler à Jarvis (Microphone)'}
        className={`px-2.5 py-2 rounded-lg border font-bold text-xs transition-all flex items-center gap-1.5 ${
          isListening
            ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-hud-amber animate-pulse'
            : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 shadow-hud-cyan'
        }`}
      >
        {isListening ? (
          <>
            <Mic className="w-4 h-4 text-amber-400 animate-bounce" />
            <span className="text-[11px] text-amber-300">Écoute...</span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] hidden sm:inline">Micro</span>
          </>
        )}
      </button>

      {/* Mode Mains Libres */}
      <button
        type="button"
        onClick={() => setHandsFree(!handsFree)}
        title="Mode conversationnel continu (Jarvis répond puis réécoute automatiquement)"
        className={`p-2 rounded-lg border text-[11px] transition-all flex items-center gap-1.5 ${
          handsFree
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-hud-cyan'
            : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-slate-200'
        }`}
      >
        <Radio className={`w-3.5 h-3.5 ${handsFree ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
        <span className="hidden sm:inline">Mains libres</span>
      </button>

      {/* Studio Vocal / Réglages de la Voix */}
      <button
        type="button"
        onClick={() => setShowSettings(!showSettings)}
        title="Personnaliser la voix de Jarvis (timbre, vitesse, choix de voix)"
        className={`p-2 rounded-lg border transition-all ${
          showSettings
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
            : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-cyan-300'
        }`}
      >
        <Settings2 className="w-4 h-4" />
      </button>

      {/* Arrêt vocal immédiat */}
      {isSpeaking && (
        <button
          type="button"
          onClick={stopSpeaking}
          title="Faire taire Jarvis immédiatement"
          className="p-2 rounded-lg border bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse flex items-center gap-1"
        >
          <VolumeX className="w-4 h-4" />
          <span className="text-[10px] hidden sm:inline">Stop</span>
        </button>
      )}

      {/* Modal Studio Vocal */}
      {showSettings && (
        <div className="absolute bottom-12 left-0 w-80 bg-[#070b16] border border-cyan-500/40 rounded-xl p-4 shadow-hud-cyan backdrop-blur-xl z-50 space-y-3.5">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
            <span className="text-cyan-400 font-bold text-xs flex items-center gap-1.5 glow-cyan">
              <Sparkles className="w-3.5 h-3.5" />
              <span>STUDIO VOCAL JARVIS</span>
            </span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-slate-100 text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* Choix de la voix (Français uniquement) */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Voix de synthèse (100% Français) :</label>
            <select
              value={selectedVoiceName}
              onChange={(e) => setSelectedVoiceName(e.target.value)}
              className="w-full bg-[#0c1427] border border-cyan-500/30 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400"
            >
              <option value="">Voix Française standard du système</option>
              {voices
                .filter((v) => v.lang.toLowerCase().startsWith('fr'))
                .map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
            </select>
          </div>

          {/* Hauteur / Timbre (Pitch) */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Timbre / Grave-Aigu :</span>
              <span className="text-cyan-300 font-bold">{pitch.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.3"
              step="0.02"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Grave / Posé (Majordome)</span>
              <span>Aigu</span>
            </div>
          </div>

          {/* Vitesse / Débit (Rate) */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Débit / Vitesse :</span>
              <span className="text-cyan-300 font-bold">{rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.5"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Calme (0.8x)</span>
              <span>Rapide (1.5x)</span>
            </div>
          </div>

          {/* Boutons Tester & Valider */}
          <div className="flex justify-between pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestVoice}
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-300 rounded hover:border-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1"
            >
              <Play className="w-3 h-3 text-cyan-400" />
              <span>Tester</span>
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-3 py-1 bg-cyan-500/20 border border-cyan-400 text-cyan-300 rounded hover:bg-cyan-500/30 text-[11px] font-bold"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

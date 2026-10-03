'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, VolumeX, Radio, Settings2, Play, Sparkles } from 'lucide-react';
import { playMicOpen, playHudReceive } from '@/lib/audio-effects';

export interface VoiceHandlerProps {
  onSpeechResult: (transcript: string) => void;
  isListening: boolean;
  setIsListening: (val: boolean) => void;
  handsFree: boolean;
  setHandsFree: (val: boolean) => void;
  streamChunkToSpeak?: string; // Phrase ou morceau à prononcer immédiatement en flux
  onSpeakingChange?: (isSpeaking: boolean) => void;
  onStopSpeakingRef?: React.MutableRefObject<(() => void) | null>;
}

export function VoiceHandler({
  onSpeechResult,
  isListening,
  setIsListening,
  handsFree,
  setHandsFree,
  streamChunkToSpeak,
  onSpeakingChange,
  onStopSpeakingRef,
}: VoiceHandlerProps) {
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Paramètres vocaux personnalisables
  const [voiceLang, setVoiceLang] = useState<'fr' | 'en'>('fr');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [pitch, setPitch] = useState<number>(0.92); // Ton élégant et posé
  const [rate, setRate] = useState<number>(1.05); // Débit fluide
  const [playVoiceOnWake, setPlayVoiceOnWake] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef<boolean>(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioWatchdogRef = useRef<any>(null);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);

  // Informer le parent du statut de parole de façon asynchrone (évite warning React setState in render)
  const updateSpeaking = useCallback(
    (speaking: boolean) => {
      setIsSpeaking(speaking);
      if (onSpeakingChange) {
        setTimeout(() => {
          onSpeakingChange(speaking);
        }, 0);
      }
    },
    [onSpeakingChange]
  );

  // Arrêter immédiatement toute synthèse vocale et annuler les flux
  const stopSpeaking = useCallback(() => {
    if (ttsAbortControllerRef.current) {
      try {
        ttsAbortControllerRef.current.abort();
      } catch (e) {}
      ttsAbortControllerRef.current = null;
    }
    if (audioWatchdogRef.current) {
      clearTimeout(audioWatchdogRef.current);
      audioWatchdogRef.current = null;
    }
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      } catch (e) {}
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    speechQueueRef.current = [];
    isPlayingQueueRef.current = false;
    updateSpeaking(false);
  }, [updateSpeaking]);

  // Exposer stopSpeaking via la ref pour page.tsx
  useEffect(() => {
    if (onStopSpeakingRef) {
      onStopSpeakingRef.current = stopSpeaking;
    }
    return () => {
      if (onStopSpeakingRef) onStopSpeakingRef.current = null;
    };
  }, [onStopSpeakingRef, stopSpeaking]);

  // Charger la langue et options sauvegardées
  useEffect(() => {
    const savedLang = localStorage.getItem('jarvis_voice_lang');
    if (savedLang === 'fr' || savedLang === 'en') {
      setVoiceLang(savedLang);
    }
    const savedWake = localStorage.getItem('jarvis_voice_on_wake');
    if (savedWake === 'true') {
      setPlayVoiceOnWake(true);
    }
  }, []);

  // Charger les voix disponibles dans le système
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);

        const savedVoice = localStorage.getItem('jarvis_voice_name');
        const langVoices = available.filter((v) => v.lang.toLowerCase().startsWith(voiceLang));

        if (savedVoice && langVoices.some((v) => v.name === savedVoice)) {
          setSelectedVoiceName(savedVoice);
        } else if (langVoices.length > 0) {
          const preferred =
            langVoices.find((v) => /natural|online|henri|denise|paul|thomas|guy|google|jenny/i.test(v.name)) ||
            langVoices[0];

          if (preferred) {
            setSelectedVoiceName(preferred.name);
          }
        } else {
          setSelectedVoiceName('');
        }
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const savedPitch = localStorage.getItem('jarvis_voice_pitch');
    if (savedPitch) setPitch(parseFloat(savedPitch));

    const savedRate = localStorage.getItem('jarvis_voice_rate');
    if (savedRate) setRate(parseFloat(savedRate));
  }, [voiceLang]);

  // Initialisation de la reconnaissance vocale Web Speech pour le bouton Micro
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang === 'fr' ? 'fr-FR' : 'en-US';
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
        console.warn('[VOICE] Fin micro:', err.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onSpeechResult, setIsListening, voiceLang]);

  // Lecture de la voix personnalisée (voix.mp3)
  const playCustomVoiceSample = () => {
    const audio = new Audio('/voix.mp3');
    audio.play().catch((err) => console.warn('Erreur lecture /voix.mp3:', err));
  };

  // Traitement sécurisé de la file vocale
  const processSpeechQueue = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (isPlayingQueueRef.current || speechQueueRef.current.length === 0) return;

    const rawSentence = speechQueueRef.current.shift();
    if (!rawSentence) return;

    // Nettoyer les balises Markdown, code, liens, emojis
    const sentence = rawSentence
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]*`/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[*#_~[\]()]/g, '')
      .replace(/[👉🎵💬💻🎨🎬▶️🔍☀️⚡🤖🔥]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!sentence || sentence.length < 2) {
      isPlayingQueueRef.current = false;
      if (speechQueueRef.current.length > 0) {
        processSpeechQueue();
      }
      return;
    }

    isPlayingQueueRef.current = true;
    updateSpeaking(true);

    const onSentenceFinish = () => {
      if (audioWatchdogRef.current) {
        clearTimeout(audioWatchdogRef.current);
        audioWatchdogRef.current = null;
      }
      isPlayingQueueRef.current = false;

      if (speechQueueRef.current.length > 0) {
        processSpeechQueue();
      } else {
        updateSpeaking(false);
        // Mode mains libres : relancer l'écoute si activé (avec délai suffisant pour éviter tout écho)
        if (handsFree && recognitionRef.current && !isPlayingQueueRef.current) {
          setTimeout(() => {
            try {
              if (handsFree && !isPlayingQueueRef.current) {
                if (playVoiceOnWake) playCustomVoiceSample();
                else playMicOpen();
                recognitionRef.current.start();
                setIsListening(true);
              }
            } catch (e) {}
          }, 1000);
        }
      }
    };

    // Synthèse via l'API TTS (MsEdgeTTS HD Neural)
    const controller = new AbortController();
    ttsAbortControllerRef.current = controller;

    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sentence, lang: voiceLang }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('API TTS indisponible');
        return res.blob();
      })
      .then((blob) => {
        ttsAbortControllerRef.current = null;
        // Si le serveur a renvoyé un blob vide ou JSON
        if (blob.size < 100) {
          onSentenceFinish();
          return;
        }

        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        let hasEnded = false;
        const cleanupAndFinish = () => {
          if (hasEnded) return;
          hasEnded = true;
          if (audioWatchdogRef.current) {
            clearTimeout(audioWatchdogRef.current);
            audioWatchdogRef.current = null;
          }
          URL.revokeObjectURL(audioUrl);
          if (currentAudioRef.current === audio) {
            currentAudioRef.current = null;
          }
          onSentenceFinish();
        };

        audio.onended = cleanupAndFinish;
        audio.onerror = (e) => {
          console.warn('[TTS] Audio playback error:', e);
          cleanupAndFinish();
        };

        // Chien de garde (watchdog) : max 8s par phrase pour ne JAMAIS geler la file vocale
        audioWatchdogRef.current = setTimeout(() => {
          console.warn('[TTS] Watchdog audio timeout:', sentence.substring(0, 30));
          try {
            audio.pause();
          } catch (e) {}
          cleanupAndFinish();
        }, Math.min(8000, Math.max(4000, sentence.length * 100)));

        audio.play().catch((playErr) => {
          console.warn('[TTS] Play blocked:', playErr);
          cleanupAndFinish();
        });
      })
      .catch((err) => {
        ttsAbortControllerRef.current = null;
        if (err.name !== 'AbortError') {
          console.warn('[TTS] API error:', err);
        }
        onSentenceFinish();
      });
  }, [voiceLang, handsFree, setIsListening, updateSpeaking, playVoiceOnWake]);

  // Ajouter un texte ou phrase à la file
  const queueSpeech = useCallback(
    (text: string) => {
      const clean = text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*#`_~[\]()]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!clean || clean.length < 2) return;

      // Limiter la file vocale à 2 phrases max pour éviter tout emballement
      if (speechQueueRef.current.length >= 2) return;

      speechQueueRef.current.push(clean);
      processSpeechQueue();
    },
    [processSpeechQueue]
  );

  // Dès qu'un fragment de phrase arrive
  useEffect(() => {
    if (streamChunkToSpeak && streamChunkToSpeak.trim()) {
      queueSpeech(streamChunkToSpeak.trim());
    }
  }, [streamChunkToSpeak, queueSpeech]);

  // Basculer l'écoute manuelle du microphone
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
    } else {
      stopSpeaking();

      if (!speechSupported) {
        alert(
          '🎙️ Reconnaissance Vocale JARVIS :\n\n' +
            'Pour parler au microphone, autorisez l\'accès au micro dans votre système ou navigateur.'
        );
        return;
      }

      try {
        if (playVoiceOnWake) {
          playCustomVoiceSample();
        } else {
          playMicOpen();
        }
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Erreur start speech:', e);
        setIsListening(false);
      }
    }
  };

  const handleTestVoice = () => {
    stopSpeaking();
    queueSpeech('À vos ordres, Monsieur Roysten. Le moteur vocal neural haute fidélité de JARVIS est opérationnel.');
  };

  const handleSaveSettings = () => {
    localStorage.setItem('jarvis_voice_name', selectedVoiceName);
    localStorage.setItem('jarvis_voice_pitch', pitch.toString());
    localStorage.setItem('jarvis_voice_rate', rate.toString());
    setShowSettings(false);
  };

  return (
    <div className="flex items-center gap-1.5 font-mono text-xs relative">
      {/* Bouton Micro Principal */}
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
        <Mic className={`w-4 h-4 ${isListening ? 'text-amber-400 animate-bounce' : 'text-cyan-400'}`} />
        <span className="text-[11px] hidden sm:inline">{isListening ? 'Écoute...' : 'Micro'}</span>
      </button>

      {/* Bouton STOP Immédiat de la Voix (visible quand JARVIS parle) */}
      {isSpeaking && (
        <button
          type="button"
          onClick={stopSpeaking}
          title="Faire taire JARVIS immédiatement"
          className="px-2.5 py-2 rounded-lg border bg-rose-500/20 border-rose-500 text-rose-300 hover:bg-rose-500/30 animate-pulse flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
        >
          <VolumeX className="w-4 h-4 text-rose-400" />
          <span className="text-[11px] font-bold">Faire taire</span>
        </button>
      )}

      {/* Bascule Rapide Langue Vocale */}
      <button
        type="button"
        onClick={() => {
          const next = voiceLang === 'fr' ? 'en' : 'fr';
          setVoiceLang(next);
          localStorage.setItem('jarvis_voice_lang', next);
        }}
        title="Basculer la langue vocale : Français ou Anglais"
        className={`px-2 py-2 rounded-lg border text-[11px] font-bold transition-all flex items-center gap-1 ${
          voiceLang === 'en'
            ? 'bg-indigo-500/25 border-indigo-400 text-indigo-300 shadow-hud-indigo animate-pulse'
            : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:border-cyan-400'
        }`}
      >
        <span>{voiceLang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}</span>
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
        title="Personnaliser la voix de Jarvis"
        className={`p-2 rounded-lg border transition-all ${
          showSettings
            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
            : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-cyan-300'
        }`}
      >
        <Settings2 className="w-4 h-4" />
      </button>

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

          {/* Fichier voix.mp3 */}
          <div className="bg-[#091024] border border-cyan-500/30 rounded p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Voix HD Neural (MsEdge Remy/Ryan)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">✓ Actif</span>
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              Synthèse vocale ultra-réaliste haute fidélité avec voix.mp3 supporté.
            </p>
            <div className="flex gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={playCustomVoiceSample}
                className="flex-1 py-1 bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 rounded hover:bg-cyan-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3 text-cyan-400" />
                <span>Écouter voix.mp3</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !playVoiceOnWake;
                  setPlayVoiceOnWake(next);
                  localStorage.setItem('jarvis_voice_on_wake', String(next));
                  if (next) playCustomVoiceSample();
                }}
                title="Jouer voix.mp3 quand vous appuyez sur le micro"
                className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all ${
                  playVoiceOnWake
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-hud-emerald'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {playVoiceOnWake ? 'Au réveil : OUI ✓' : 'Au réveil : NON'}
              </button>
            </div>
          </div>

          {/* Choix de la langue vocale */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Langue de l'interaction :</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setVoiceLang('fr');
                  localStorage.setItem('jarvis_voice_lang', 'fr');
                }}
                className={`py-1 rounded text-xs font-bold border ${
                  voiceLang === 'fr'
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-hud-cyan'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                🇫🇷 Français (Remy HD)
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoiceLang('en');
                  localStorage.setItem('jarvis_voice_lang', 'en');
                }}
                className={`py-1 rounded text-xs font-bold border ${
                  voiceLang === 'en'
                    ? 'bg-indigo-500/25 border-indigo-400 text-indigo-300 shadow-hud-indigo'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                🇬🇧 English (Ryan HD)
              </button>
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
              <span>Tester voix</span>
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

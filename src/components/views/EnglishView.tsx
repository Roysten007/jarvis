'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Languages, Send, Sparkles, MessageCircle, Mic, MicOff, Volume2, VolumeX, Play } from 'lucide-react';

export function EnglishView() {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'coach'; text: string }[]>([
    {
      role: 'coach',
      text: "Hello Roysten! I am your Technical English Coach. Practice discussing your coding projects, physics concepts, or everyday engineering situations with me. I'll correct your mistakes and suggest idiomatic phrasing.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialiser la reconnaissance vocale en anglais
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.lang = 'en-US';
        rec.continuous = false;
        rec.interimResults = false;
        rec.onresult = (ev: any) => {
          const transcript = ev.results[0][0].transcript;
          if (transcript) {
            setInputMessage(transcript);
            sendMessage(transcript);
          }
        };
        rec.onend = () => setIsListening(false);
        rec.onerror = () => setIsListening(false);
        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Speech err:', e);
      }
    }
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      } catch (e) {}
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined') return;
    stopSpeaking();

    // Nettoyer balises markdown
    const clean = text.replace(/[*#`_~[\]()]/g, '').replace(/https?:\/\/\S+/g, '').trim();
    if (!clean) return;

    // 1. Tenter la voix neurale anglaise haute fidélité via /api/tts
    fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, lang: 'en' }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('API TTS error');
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        setIsSpeaking(true);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          setIsSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudioRef.current = null;
          fallbackSpeech(clean);
        };
        audio.play().catch(() => fallbackSpeech(clean));
      })
      .catch(() => fallbackSpeech(clean));

    function fallbackSpeech(t: string) {
      if (!window.speechSynthesis) return;
      const utterance = new SpeechSynthesisUtterance(t);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userText = textToSend.trim();
    setInputMessage('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/modules/english', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      const reply = data.reply || data.error;
      setMessages((prev) => [
        ...prev,
        { role: 'coach', text: reply },
      ]);
      if (autoSpeak && reply) {
        speakText(reply);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'coach', text: `Connection error: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid flex flex-col space-y-4">
      <div className="border-b border-cyan-500/20 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
            <Languages className="w-4 h-4" />
            <span>TECHNICAL ENGLISH COACH // PRATIQUE FLUIDE</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Parlez ou écrivez en anglais avec JARVIS. Il répond en anglais avec la voix britannique/américaine et vous corrige.
          </p>
        </div>

        {/* Contrôles vocaux */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
              autoSpeak
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
            <span>Voix auto : {autoSpeak ? 'ON' : 'OFF'}</span>
          </button>
          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="px-2 py-1 rounded text-[10px] font-bold bg-rose-500/20 border border-rose-400 text-rose-300 flex items-center gap-1"
            >
              <VolumeX className="w-3 h-3" />
              <span>Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg hud-panel max-w-2xl ${
              m.role === 'coach'
                ? 'border-cyan-500/30 mr-auto text-slate-200'
                : 'border-indigo-500/40 bg-indigo-950/20 ml-auto text-indigo-200'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-bold">
              <span>{m.role === 'coach' ? 'JARVIS (ENGLISH COACH)' : 'ROYSTEN'}</span>
              {m.role === 'coach' && (
                <button
                  type="button"
                  onClick={() => speakText(m.text)}
                  title="Écouter la prononciation"
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[9px] ml-2"
                >
                  <Play className="w-2.5 h-2.5" />
                  <span>Listen</span>
                </button>
              )}
            </div>
            <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="p-3 text-cyan-400 animate-pulse text-xs">
            JARVIS is analyzing your grammar and formulating the response...
          </div>
        )}
      </div>

      {/* Saisie */}
      <form onSubmit={handleSend} className="flex gap-2 items-center">
        {/* Bouton Micro Anglais */}
        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? 'Stop listening' : 'Speak in English'}
          className={`px-3 py-2 rounded-lg border font-bold text-xs transition-all flex items-center gap-1.5 ${
            isListening
              ? 'bg-amber-500/25 border-amber-400 text-amber-300 animate-pulse'
              : 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400'
          }`}
        >
          {isListening ? (
            <>
              <Mic className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-[11px]">Listening...</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] hidden sm:inline">Speak EN</span>
            </>
          )}
        </button>

        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Speak or type your message in English..."
          className="flex-1 bg-[#090e1a] border border-cyan-500/30 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
        />
        <button
          type="submit"
          disabled={loading || !inputMessage.trim()}
          className="bg-cyan-500/20 border border-cyan-400 text-cyan-300 px-4 py-2 rounded flex items-center gap-1.5 hover:bg-cyan-500/30 transition-all shadow-hud-cyan disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}

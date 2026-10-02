'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Sun, Search, Calculator, PlusCircle } from 'lucide-react';
import { VoiceHandler } from '../voice/VoiceHandler';

interface ChatInputProps {
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  onQuickAction: (action: string) => void;
  voiceTextToSpeak?: string;
  onNewSession: () => void;
}

export function ChatInput({
  onSendMessage,
  isLoading,
  onQuickAction,
  voiceTextToSpeak,
  onNewSession,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading) return;

    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSpeechResult = (transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    // En mode mains libres, envoyer automatiquement
    if (handsFree && transcript.trim()) {
      onSendMessage(transcript.trim());
      setText('');
    }
  };

  return (
    <div className="border-t border-cyan-500/20 bg-[#040814]/95 backdrop-blur-md p-3 font-mono text-xs">
      {/* Suggestions rapides HUD */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 text-[11px] text-slate-400">
        <button
          onClick={onNewSession}
          className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded hover:border-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap"
        >
          <PlusCircle className="w-3 h-3 text-cyan-400" />
          <span>Nouvelle session</span>
        </button>

        <button
          onClick={() => onQuickAction('morning_briefing')}
          className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded hover:border-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
        >
          <Sun className="w-3 h-3 text-amber-400" />
          <span>Morning Briefing</span>
        </button>

        <button
          onClick={() => onQuickAction('web_search')}
          className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded hover:border-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap"
        >
          <Search className="w-3 h-3 text-cyan-400" />
          <span>Recherche Web</span>
        </button>

        <button
          onClick={() => onQuickAction('calc')}
          className="flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded hover:border-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap"
        >
          <Calculator className="w-3 h-3 text-emerald-400" />
          <span>Calculs & Physique</span>
        </button>
      </div>

      {/* Barre de saisie */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <VoiceHandler
          onSpeechResult={handleSpeechResult}
          isListening={isListening}
          setIsListening={setIsListening}
          handsFree={handsFree}
          setHandsFree={setHandsFree}
          voiceTextToSpeak={voiceTextToSpeak}
        />

        <div className="flex-1 relative bg-[#090e1a] border border-cyan-500/30 rounded-lg focus-within:border-cyan-400 focus-within:shadow-hud-cyan transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'À votre écoute, Monsieur...' : 'Ordre pour JARVIS... (Entrée pour envoyer)'}
            disabled={isLoading}
            className="w-full bg-transparent px-3 py-2 text-slate-100 placeholder-slate-500 outline-none resize-none text-xs leading-normal"
          />
        </div>

        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="h-9 px-3.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-hud-cyan flex items-center justify-center"
        >
          <Send className="w-4 h-4 text-cyan-400" />
        </button>
      </form>
    </div>
  );
}

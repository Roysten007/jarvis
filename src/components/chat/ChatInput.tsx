'use client';

import React, { useState, useRef } from 'react';
import { Send, Sun, Search, Calculator, PlusCircle, Image as ImageIcon, X } from 'lucide-react';
import { VoiceHandler } from '../voice/VoiceHandler';
import { playHudTransmit } from '@/lib/audio-effects';

interface ChatInputProps {
  onSendMessage: (msg: string, image?: string) => void;
  isLoading: boolean;
  onQuickAction: (action: string) => void;
  streamChunkToSpeak?: string;
  onNewSession: () => void;
}

export function ChatInput({
  onSendMessage,
  isLoading,
  onQuickAction,
  streamChunkToSpeak,
  onNewSession,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [handsFree, setHandsFree] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !selectedImage) || isLoading) return;

    playHudTransmit();
    onSendMessage(text.trim() || 'Analyse cette image ou capture d\'écran de mon travail.', selectedImage || undefined);
    setText('');
    setSelectedImage(null);
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

  // Support du copier-coller direct de capture d'écran (Ctrl + V)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            setSelectedImage(event.target?.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  // Sélection d'image via explorateur de fichiers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSpeechResult = (transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    if (handsFree && transcript.trim()) {
      playHudTransmit();
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

      {/* Aperçu de la capture d'écran / image jointe */}
      {selectedImage && (
        <div className="mb-2 p-2 bg-[#090e1a] border border-cyan-500/40 rounded-lg flex items-center justify-between gap-3 w-fit">
          <div className="flex items-center gap-2">
            <img src={selectedImage} alt="Capture" className="w-12 h-12 object-cover rounded border border-cyan-400/40" />
            <div className="text-[11px]">
              <span className="text-cyan-300 font-bold block">Capture d'écran prête pour analyse</span>
              <span className="text-slate-500 text-[10px]">Llama 3.2 Vision examinera votre travail</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="text-slate-400 hover:text-rose-400 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barre de saisie */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Gestionnaire vocal */}
        <VoiceHandler
          onSpeechResult={handleSpeechResult}
          isListening={isListening}
          setIsListening={setIsListening}
          handsFree={handsFree}
          setHandsFree={setHandsFree}
          streamChunkToSpeak={streamChunkToSpeak}
        />

        {/* Bouton Capture d'écran / Image */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Joindre une image ou capture d'écran de votre travail (ou faites Ctrl+V)"
          className={`p-2 rounded-lg border transition-all ${
            selectedImage
              ? 'bg-cyan-500/30 border-cyan-400 text-cyan-300'
              : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        {/* Champ texte */}
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
            onPaste={handlePaste}
            placeholder={
              isListening
                ? 'À votre écoute, Monsieur Roysten...'
                : 'Ordre pour JARVIS... (ou collez une capture d\'écran avec Ctrl+V)'
            }
            disabled={isLoading}
            className="w-full bg-transparent px-3 py-2 text-slate-100 placeholder-slate-500 outline-none resize-none text-xs leading-normal"
          />
        </div>

        {/* Bouton d'envoi */}
        <button
          type="submit"
          disabled={(!text.trim() && !selectedImage) || isLoading}
          className="h-9 px-3.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-hud-cyan flex items-center justify-center"
        >
          <Send className="w-4 h-4 text-cyan-400" />
        </button>
      </form>
    </div>
  );
}

'use client';

import React, { useRef, useEffect } from 'react';
import { Bot, User, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

import { ArcReactorWake } from '../hud/ArcReactorWake';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt?: string;
  toolCalls?: any;
}

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent?: string;
  onVoiceCommand?: (cmd: string) => void;
}

export function ChatContainer({
  messages,
  isLoading,
  streamingContent,
  onVoiceCommand,
}: ChatContainerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, isLoading]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm hud-grid flex flex-col">
      {messages.length === 0 && !streamingContent && (
        <div className="my-auto flex flex-col items-center justify-center text-center p-4 text-slate-500">
          {/* Réacteur Arc Interactif avec Wake Word 'JARVIS' */}
          <ArcReactorWake
            onCommandReceived={(cmd) => onVoiceCommand && onVoiceCommand(cmd)}
            isProcessing={isLoading}
            activeStatusText="Dites simplement 'JARVIS...' ou touchez pour ordonner sans clavier"
          />

          <h2 className="text-base font-bold text-slate-200 glow-cyan mt-3 mb-1">
            J.A.R.V.I.S // TERMINAL HOLOGRAPHIQUE
          </h2>
          <p className="max-w-md text-xs text-slate-400 leading-relaxed font-sans">
            À vos ordres, Monsieur Roysten. Parlez directement ou touchez l'écran. Je peux analyser vos e-mails, WhatsApp, vos devoirs en maths/physique ou inspecter votre écran.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px]">
            <span className="bg-slate-900/80 border border-cyan-500/20 px-2.5 py-1 rounded text-cyan-300">
              🎙️ Wake Word : "Jarvis" / "Réveille-toi"
            </span>
            <span className="bg-slate-900/80 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-300">
              📲 WhatsApp & LinkedIn connectés
            </span>
            <span className="bg-slate-900/80 border border-amber-500/20 px-2.5 py-1 rounded text-amber-300">
              👁️ Analyse d'écran par Ctrl+V
            </span>
          </div>
        </div>
      )}

      {messages.map((msg) => {
        const isAssistant = msg.role === 'assistant';
        return (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${isAssistant ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded flex items-center justify-center shrink-0 border ${
                isAssistant
                  ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
                  : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-400'
              }`}
            >
              {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            {/* Bulle message */}
            <div
              className={`hud-panel rounded-lg p-3.5 relative group ${
                isAssistant
                  ? 'border-cyan-500/20 text-slate-200'
                  : 'border-indigo-500/30 bg-indigo-950/30 text-indigo-100'
              }`}
            >
              <div className="text-[10px] text-slate-500 mb-1 flex items-center justify-between">
                <span>{isAssistant ? 'JARVIS' : 'ROYSTEN'}</span>
                {isAssistant && (
                  <button
                    onClick={() => copyToClipboard(msg.content, msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-cyan-400 p-1"
                    title="Copier le texte"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Contenu textuel avec sauts de lignes respectés */}
              <div className="whitespace-pre-wrap leading-relaxed text-xs">
                {msg.content}
              </div>
            </div>
          </div>
        );
      })}

      {/* Message en cours de streaming */}
      {streamingContent && (
        <div className="flex gap-3 max-w-3xl mr-auto">
          <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 border bg-cyan-950/80 border-cyan-500/40 text-cyan-400">
            <Bot className="w-4 h-4 animate-spin-slow" />
          </div>
          <div className="hud-panel rounded-lg p-3.5 border-cyan-500/40 text-slate-200">
            <div className="text-[10px] text-cyan-400 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span>JARVIS EN COURS DE TRANSMISSION...</span>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed text-xs">
              {streamingContent}
            </div>
          </div>
        </div>
      )}

      {/* Indicateur de chargement / réflexion */}
      {isLoading && !streamingContent && (
        <div className="flex items-center gap-2 text-cyan-400/80 text-xs py-2 px-3 bg-cyan-950/20 border border-cyan-500/20 rounded-md w-fit">
          <Terminal className="w-3.5 h-3.5 animate-pulse" />
          <span className="animate-pulse">JARVIS analyse et formule la réponse...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

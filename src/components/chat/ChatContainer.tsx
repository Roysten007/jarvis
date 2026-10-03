'use client';

import React, { useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Music,
  MessageSquare,
  Code2,
  Camera,
  Globe,
  Send,
  Share2,
  Video,
  Palette,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

import { ArcReactorWake } from '../hud/ArcReactorWake';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt?: string;
  toolCalls?: any;
  clientAction?: {
    type: 'open_url' | 'screenshot' | 'switch_tab' | 'media_player';
    url?: string;
    tab?: string;
    label?: string;
    youtubeVideoId?: string;
    spotifyUri?: string;
    mediaTitle?: string;
    mediaArtist?: string;
  };
}

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent?: string;
  onVoiceCommand?: (cmd: string) => void;
  isSpeaking?: boolean;
  isAwake?: boolean;
  onTapWake?: () => void;
  onTabChange?: (tab: any) => void;
}

interface ActionMeta {
  url: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  icon: any;
  borderClass: string;
  bgClass: string;
  btnClass: string;
}

function getActionMeta(url: string, label?: string): ActionMeta {
  const lower = url.toLowerCase();

  // Spotify
  if (lower.startsWith('spotify:') || lower.includes('spotify.com')) {
    return {
      url,
      title: 'SPOTIFY // APPLICATION NATIVE',
      subtitle: 'Contrôle musical haute fidélité sur votre bureau Windows',
      buttonLabel: label || 'Basculer sur Spotify Desktop',
      icon: Music,
      borderClass: 'border-emerald-500/50',
      bgClass: 'bg-emerald-950/30',
      btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40',
    };
  }

  // WhatsApp
  if (lower.startsWith('whatsapp:') || lower.includes('whatsapp.com') || lower.includes('wa.me')) {
    return {
      url,
      title: 'WHATSAPP // MESSAGERIE DIRECTE',
      subtitle: 'Message préparé, prêt à être envoyé dans WhatsApp Desktop',
      buttonLabel: label || 'Ouvrir WhatsApp Desktop',
      icon: MessageSquare,
      borderClass: 'border-emerald-500/50',
      bgClass: 'bg-emerald-950/30',
      btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40',
    };
  }

  // VS Code / Antigravity / ZCode
  if (lower.startsWith('vscode:') || lower.includes('code') || lower.includes('antigravity')) {
    return {
      url,
      title: 'VS CODE // ENVIRONNEMENT DE CODE',
      subtitle: 'Projet Jarvis prêt dans votre éditeur de code',
      buttonLabel: label || 'Basculer sur VS Code / IDE',
      icon: Code2,
      borderClass: 'border-cyan-500/50',
      bgClass: 'bg-cyan-950/30',
      btnClass: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40',
    };
  }

  // Instagram
  if (lower.includes('instagram.com')) {
    return {
      url,
      title: 'INSTAGRAM // RÉSEAU & LIFESTYLE',
      subtitle: 'Légende copiée dans votre presse-papier Windows (Ctrl + V)',
      buttonLabel: label || 'Ouvrir Instagram',
      icon: Camera,
      borderClass: 'border-rose-500/50',
      bgClass: 'bg-rose-950/30',
      btnClass: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40',
    };
  }

  // Facebook
  if (lower.includes('facebook.com')) {
    return {
      url,
      title: 'FACEBOOK // PUBLICATION RAPIDE',
      subtitle: 'Texte copié dans le presse-papier, prêt à publier',
      buttonLabel: label || 'Ouvrir Facebook',
      icon: Globe,
      borderClass: 'border-blue-500/50',
      bgClass: 'bg-blue-950/30',
      btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40',
    };
  }

  // Twitter / X
  if (lower.includes('twitter.com') || lower.includes('x.com')) {
    return {
      url,
      title: 'X (TWITTER) // PUBLICATION INSTANTANÉE',
      subtitle: 'Tweet prérempli dans l\'interface X, prêt en 1 clic',
      buttonLabel: label || 'Publier sur X (Twitter)',
      icon: Send,
      borderClass: 'border-sky-500/50',
      bgClass: 'bg-sky-950/30',
      btnClass: 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/40',
    };
  }

  // LinkedIn
  if (lower.includes('linkedin.com')) {
    return {
      url,
      title: 'LINKEDIN // PROSPECTION & RÉSEAU',
      subtitle: 'Post professionnel copié dans le presse-papier Windows',
      buttonLabel: label || 'Accéder à LinkedIn',
      icon: Share2,
      borderClass: 'border-blue-500/50',
      bgClass: 'bg-blue-950/30',
      btnClass: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40',
    };
  }

  // Canva
  if (lower.includes('canva.com') || lower.startsWith('canva:')) {
    return {
      url,
      title: 'CANVA // STUDIO DE DESIGN',
      subtitle: 'Espace de conception graphique et création visuelle',
      buttonLabel: label || 'Ouvrir Canva',
      icon: Palette,
      borderClass: 'border-purple-500/50',
      bgClass: 'bg-purple-950/30',
      btnClass: 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/40',
    };
  }

  // CapCut
  if (lower.includes('capcut.com') || lower.startsWith('capcut:')) {
    return {
      url,
      title: 'CAPCUT // MONTAGE VIDÉO',
      subtitle: 'Suite de montage vidéo et effets dynamiques',
      buttonLabel: label || 'Ouvrir CapCut',
      icon: Video,
      borderClass: 'border-amber-500/50',
      bgClass: 'bg-amber-950/30',
      btnClass: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40',
    };
  }

  // GitHub
  if (lower.includes('github.com')) {
    return {
      url,
      title: 'GITHUB // DÉPÔT DE CODE SOURCE',
      subtitle: 'Création de repo et liaison avec votre code local',
      buttonLabel: label || 'Accéder à GitHub',
      icon: Terminal,
      borderClass: 'border-slate-500/50',
      bgClass: 'bg-slate-900/40',
      btnClass: 'bg-slate-700 hover:bg-slate-600 text-white shadow-slate-900/40',
    };
  }

  // Lovable
  if (lower.includes('lovable.dev')) {
    return {
      url,
      title: 'LOVABLE // GÉNÉRATEUR IA DE SITES',
      subtitle: 'Prompt d\'architecture copié dans votre presse-papier (Ctrl+V)',
      buttonLabel: label || 'Ouvrir Lovable Projects',
      icon: Sparkles,
      borderClass: 'border-pink-500/50',
      bgClass: 'bg-pink-950/30',
      btnClass: 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-pink-900/40',
    };
  }

  // Vercel
  if (lower.includes('vercel.com')) {
    return {
      url,
      title: 'VERCEL // DÉPLOIEMENT CLOUD',
      subtitle: 'Déploiement en 1 clic avec certificat SSL et CDN mondial',
      buttonLabel: label || 'Déployer sur Vercel',
      icon: Globe,
      borderClass: 'border-cyan-500/50',
      bgClass: 'bg-cyan-950/30',
      btnClass: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40',
    };
  }

  // YouTube
  if (lower.includes('youtube.com')) {
    return {
      url,
      title: 'YOUTUBE // VIDÉO & STREAM',
      subtitle: 'Vidéo ou recherche multimédia sur YouTube',
      buttonLabel: label || 'Voir sur YouTube',
      icon: Video,
      borderClass: 'border-red-500/50',
      bgClass: 'bg-red-950/30',
      btnClass: 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/40',
    };
  }

  // Par défaut
  return {
    url,
    title: 'NAVIGATION // ACCÈS DIRECT',
    subtitle: 'Lien système ou ressource Web externe',
    buttonLabel: label || 'Ouvrir le lien',
    icon: ExternalLink,
    borderClass: 'border-cyan-500/50',
    bgClass: 'bg-cyan-950/30',
    btnClass: 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/40',
  };
}

function extractActionUrl(msg: Message): { url: string; label?: string } | null {
  if (
    msg.clientAction?.url &&
    (msg.clientAction.url.startsWith('http') ||
      msg.clientAction.url.startsWith('spotify:') ||
      msg.clientAction.url.startsWith('whatsapp:') ||
      msg.clientAction.url.startsWith('vscode:') ||
      msg.clientAction.url.startsWith('canva:'))
  ) {
    return { url: msg.clientAction.url, label: msg.clientAction.label };
  }
  return null;
}

function formatInlineText(text: string): React.ReactNode {
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={`bold-${match.index}`} className="text-slate-100 font-bold">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function renderRichContent(content: string, onExecute: (url: string) => void) {
  const lines = content.split('\n');
  return lines.map((line, lineIdx) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(formatInlineText(line.slice(lastIndex, match.index)));
      }
      const label = match[1];
      const url = match[2];
      parts.push(
        <button
          key={`link-${lineIdx}-${match.index}`}
          onClick={() => onExecute(url)}
          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors mx-1 cursor-pointer"
        >
          <span>{label}</span>
          <ArrowUpRight className="w-3 h-3 inline" />
        </button>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(formatInlineText(line.slice(lastIndex)));
    }

    return (
      <div key={`line-${lineIdx}`} className="min-h-[1.25rem]">
        {parts.length > 0 ? parts : <span>&nbsp;</span>}
      </div>
    );
  });
}

export function ChatContainer({
  messages,
  isLoading,
  streamingContent,
  onVoiceCommand,
  isSpeaking = false,
  isAwake = false,
  onTapWake,
  onTabChange,
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

  const handleExecuteAction = (url: string) => {
    if (!url) return;
    if (/^(spotify|vscode|whatsapp|canva|capcut):/i.test(url)) {
      const link = document.createElement('a');
      link.href = url;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm hud-grid flex flex-col">
      {messages.length === 0 && !streamingContent && (
        <div className="my-auto flex flex-col items-center justify-center text-center p-4 text-slate-500">
          <ArcReactorWake
            isMaster={false}
            onCommandReceived={(cmd) => onVoiceCommand && onVoiceCommand(cmd)}
            isProcessing={isLoading}
            isSpeaking={isSpeaking}
            isAwakeExternal={isAwake}
            onTapWakeExternal={onTapWake}
            activeStatusText="Dites simplement 'JARVIS...' ou touchez pour ordonner sans clavier"
          />

          <h2 className="text-base font-bold text-slate-200 glow-cyan mt-3 mb-1">
            J.A.R.V.I.S // TERMINAL HOLOGRAPHIQUE
          </h2>
          <p className="max-w-md text-xs text-slate-400 leading-relaxed font-sans">
            À vos ordres, Monsieur Roysten. Parlez directement ou touchez l'écran. Je pilote vos applications, WhatsApp, réseaux sociaux et votre environnement de code.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px]">
            <span className="bg-slate-900/80 border border-cyan-500/20 px-2.5 py-1 rounded text-cyan-300">
              🎙️ Wake Word : "Jarvis" / "Réveille-toi"
            </span>
            <span className="bg-slate-900/80 border border-emerald-500/20 px-2.5 py-1 rounded text-emerald-300">
              🎵 Spotify & WhatsApp Desktop connectés
            </span>
            <span className="bg-slate-900/80 border border-blue-500/20 px-2.5 py-1 rounded text-blue-300">
              🚀 Pilotage Réseaux (Facebook, X, LinkedIn, Insta)
            </span>
          </div>
        </div>
      )}

      {messages.map((msg) => {
        const isAssistant = msg.role === 'assistant';
        const action = isAssistant ? extractActionUrl(msg) : null;
        const actionMeta = action ? getActionMeta(action.url, action.label) : null;
        const ActionIcon = actionMeta ? actionMeta.icon : null;

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
                <span className="font-semibold tracking-wider">{isAssistant ? 'JARVIS' : 'ROYSTEN'}</span>
                {isAssistant && (
                  <button
                    onClick={() => copyToClipboard(msg.content, msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-cyan-400 p-1 cursor-pointer"
                    title="Copier le texte"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Contenu textuel avec liens cliquables et gras supportés */}
              <div className="leading-relaxed text-xs space-y-1">
                {renderRichContent(msg.content, handleExecuteAction)}
              </div>

              {/* CARTE D'ACTION RAPIDE INTERACTIVE HUD */}
              {actionMeta && ActionIcon && (
                <div className={`mt-3.5 pt-3 border-t border-cyan-500/20 rounded-md p-3 ${actionMeta.bgClass} border ${actionMeta.borderClass}`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded bg-slate-950/80 border border-slate-700/60 text-cyan-300">
                        <ActionIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-100 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>{actionMeta.title}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          {actionMeta.subtitle}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExecuteAction(actionMeta.url)}
                      className={`w-full sm:w-auto px-4 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${actionMeta.btnClass}`}
                    >
                      <ActionIcon className="w-3.5 h-3.5" />
                      <span>{actionMeta.buttonLabel}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
                    </button>
                  </div>
                </div>
              )}

              {/* CARTE DE CAPTURE D'ÉCRAN HOLOGRAPHIQUE */}
              {msg.clientAction?.type === 'screenshot' && msg.clientAction.url && (
                <div className="mt-3.5 pt-3 border-t border-cyan-500/30 rounded-lg p-3 bg-cyan-950/40 border border-cyan-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                      <Camera className="w-4 h-4 text-cyan-400" />
                      <span className="glow-cyan">CAPTURE D'ÉCRAN DU BUREAU // SYNTHÈSE VISUELLE</span>
                    </div>
                    <a
                      href={msg.clientAction.url}
                      download={`jarvis_capture_${Date.now()}.png`}
                      className="text-[11px] text-cyan-400 hover:text-cyan-200 underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Télécharger HD</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="relative rounded-lg overflow-hidden border border-cyan-500/40 bg-black/80 group max-h-96 flex items-center justify-center">
                    <img
                      src={msg.clientAction.url}
                      alt="Capture d'écran Windows"
                      className="w-full max-h-96 object-contain rounded transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  </div>
                </div>
              )}

              {/* LECTEUR MULTIMÉDIA DIRECT // YOUTUBE */}
              {msg.clientAction?.youtubeVideoId && (
                <div className="mt-3.5 pt-3 border-t border-red-500/30 rounded-lg p-3 bg-red-950/40 border border-red-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-300 font-bold text-xs">
                      <Music className="w-4 h-4 text-red-400 animate-pulse" />
                      <span className="glow-red">LECTEUR AUDIO // YOUTUBE EN DIRECT</span>
                    </div>
                    <span className="text-[10px] text-red-400/90 font-mono flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      LECTURE ACTIVE
                    </span>
                  </div>
                  <div className="relative rounded-lg overflow-hidden border border-red-500/40 bg-black aspect-video max-h-60 shadow-lg shadow-red-950/50">
                    <iframe
                      src={`https://www.youtube.com/embed/${msg.clientAction.youtubeVideoId}?autoplay=1&enablejsapi=1`}
                      title={msg.clientAction.mediaTitle || 'YouTube Direct Audio'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>
              )}

              {/* LECTEUR SPOTIFY DIRECT INTÉGRÉ */}
              {msg.clientAction?.spotifyUri && (
                <div className="mt-3.5 pt-3 border-t border-emerald-500/30 rounded-lg p-3 bg-emerald-950/40 border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                      <Music className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span className="glow-emerald">SPOTIFY // LECTURE EN DIRECT</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      SYNCHRONISÉ
                    </span>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-emerald-500/40 bg-black max-h-48 shadow-lg shadow-emerald-950/50">
                    <iframe
                      src={`https://open.spotify.com/embed/${msg.clientAction.spotifyUri.replace('spotify:', '').replace(/:/g, '/')}?utm_source=generator&theme=0`}
                      width="100%"
                      height="152"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}

              {/* CARTE DE BASCULE DE MODULE SYSTÈME */}
              {msg.clientAction?.type === 'switch_tab' && msg.clientAction.tab && (
                <div className="mt-3.5 pt-3 border-t border-cyan-500/30 rounded-md p-3 bg-gradient-to-r from-cyan-950/60 to-slate-900/80 border border-cyan-500/40">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded bg-cyan-900/40 border border-cyan-400/30 text-cyan-300">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-slate-100 flex items-center gap-1.5">
                          <span>MODULE SYSTÈME DISPONIBLE</span>
                        </div>
                        <div className="text-[10px] text-cyan-300/80 leading-tight">
                          {msg.clientAction.label || `Accéder au module ${msg.clientAction.tab}`}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onTabChange && onTabChange(msg.clientAction?.tab as any)}
                      className="w-full sm:w-auto px-4 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white"
                    >
                      <span>{msg.clientAction.label || `Ouvrir ${msg.clientAction.tab}`}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
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
            <div className="leading-relaxed text-xs space-y-1">
              {renderRichContent(streamingContent, handleExecuteAction)}
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

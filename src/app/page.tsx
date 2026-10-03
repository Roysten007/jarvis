'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/hud/Header';
import { Navigation, NavTab } from '@/components/hud/Navigation';
import { ChatContainer, Message } from '@/components/chat/ChatContainer';
import { ChatInput } from '@/components/chat/ChatInput';
import { MemoryView } from '@/components/views/MemoryView';
import { AgentView } from '@/components/views/AgentView';
import { StudyView } from '@/components/views/StudyView';
import { ProspectionView } from '@/components/views/ProspectionView';
import { SocialMediaView } from '@/components/views/SocialMediaView';
import { SystemControlView } from '@/components/views/SystemControlView';
import { EnglishView } from '@/components/views/EnglishView';
import { TasksView } from '@/components/views/TasksView';
import { SettingsView } from '@/components/views/SettingsView';
import { JARVIS_CONFIG } from '@/lib/config';
import { playHudReceive } from '@/lib/audio-effects';

export default function JarvisDashboard() {
  const [activeTab, setActiveTab] = useState<NavTab>('chat');
  const [currentModel, setCurrentModel] = useState<string>(JARVIS_CONFIG.defaultFastModel);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [streamChunkToSpeak, setStreamChunkToSpeak] = useState<string>('');

  // États vocaux unifiés pour synchroniser HUD, micro et réacteurs
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [isAwake, setIsAwake] = useState<boolean>(false);
  const [voiceAudioEnabled, setVoiceAudioEnabled] = useState<boolean>(true);

  const speechSentenceBufferRef = useRef<string>('');
  const stopSpeakingRef = useRef<(() => void) | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const spokenSentencesCountRef = useRef<number>(0);
  const isSpeechCancelledRef = useRef<boolean>(false);

  // Charger la préférence audio
  useEffect(() => {
    const saved = localStorage.getItem('jarvis_voice_audio_enabled');
    if (saved !== null) {
      setVoiceAudioEnabled(saved === 'true');
    }
  }, []);

  const handleToggleVoiceAudio = () => {
    const next = !voiceAudioEnabled;
    setVoiceAudioEnabled(next);
    localStorage.setItem('jarvis_voice_audio_enabled', String(next));
    if (!next && stopSpeakingRef.current) {
      stopSpeakingRef.current();
    }
  };

  // Enregistrement du Service Worker PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Échec enregistrement Service Worker:', err);
      });
    }
  }, []);

  // Arrêter l'inférence en cours et débloquer l'interface
  const handleStopGeneration = useCallback(() => {
    isSpeechCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (stopSpeakingRef.current) {
      stopSpeakingRef.current();
    }
    setIsLoading(false);
    setStreamingContent('');
    setStreamChunkToSpeak('');
    speechSentenceBufferRef.current = '';
  }, []);

  // Réinitialiser la session
  const handleNewSession = useCallback(() => {
    handleStopGeneration();
    setConversationId(null);
    setMessages([]);
    setStreamingContent('');
    if (voiceAudioEnabled) {
      setStreamChunkToSpeak('Nouvelle session initialisée, Monsieur Roysten.');
    }
  }, [handleStopGeneration, voiceAudioEnabled]);

  // Découpage et envoi au TTS en flux : maximum 2 phrases concises par réponse
  const feedSpeechBuffer = (delta: string, isVoiceTurn: boolean) => {
    if (isSpeechCancelledRef.current) return;
    // Ne parler à voix haute QUE si l'utilisateur a parlé au micro ET que l'audio est activé
    // Cela empêche totalement la voix de parler quand on écrit du texte au clavier !
    if (!isVoiceTurn || !voiceAudioEnabled) return;
    if (spokenSentencesCountRef.current >= 1) return;

    speechSentenceBufferRef.current += delta;
    // Détection des fins de phrases (. ! ? \n)
    const match = speechSentenceBufferRef.current.match(/^([\s\S]*?[.!?\n]+)([\s\S]*)$/);
    if (match) {
      const sentence = match[1].trim();
      speechSentenceBufferRef.current = match[2];
      // Ignorer les blocs de code ou chiffres isolés
      if (sentence.length > 3 && !sentence.startsWith('```') && !/^\d+\.$/.test(sentence)) {
        spokenSentencesCountRef.current += 1;
        setStreamChunkToSpeak(sentence);
      }
    }
  };

  // Envoi de message avec streaming SSE, annulation sécurisée et TTS
  const handleSendMessage = async (text: string, image?: string, isVoice: boolean = false) => {
    if (!text.trim() && !image) return;

    // Réinitialiser les compteurs vocaux et annulations
    isSpeechCancelledRef.current = false;
    spokenSentencesCountRef.current = 0;

    // Si une synthèse vocale précédente parlait encore, l'arrêter immédiatement
    if (stopSpeakingRef.current) {
      stopSpeakingRef.current();
    }
    setStreamChunkToSpeak('');

    // Si une requête précédente tournait encore, l'annuler proprement
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: image ? `${text}\n\n[Capture d'écran jointe]` : text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingContent('');
    speechSentenceBufferRef.current = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          image,
          conversationId,
          model: currentModel,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let activeConvId = conversationId;
      let receivedClientAction: any = undefined;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                if (parsed.conversationId && !activeConvId) {
                  activeConvId = parsed.conversationId;
                  setConversationId(parsed.conversationId);
                }
                if (parsed.content) {
                  accumulated += parsed.content;
                  setStreamingContent((prev) => prev + parsed.content);
                  feedSpeechBuffer(parsed.content, isVoice);
                }
                if (parsed.clientAction) {
                  receivedClientAction = parsed.clientAction;
                  if (parsed.clientAction.type === 'switch_tab' && parsed.clientAction.tab) {
                    setActiveTab(parsed.clientAction.tab as NavTab);
                  } else if (parsed.clientAction.url) {
                    try {
                      const actionUrl = parsed.clientAction.url;
                      if (window.electronAPI?.openExternal && !actionUrl.startsWith('data:')) {
                        window.electronAPI.openExternal(actionUrl);
                      } else if (/^(spotify|vscode|whatsapp|canva|capcut):/i.test(actionUrl)) {
                        const link = document.createElement('a');
                        link.href = actionUrl;
                        link.style.display = 'none';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } else if (actionUrl.startsWith('http')) {
                        window.open(actionUrl, '_blank', 'noopener,noreferrer');
                      }
                    } catch (e) {
                      console.warn('[CLIENT ACTION WARNING]', e);
                    }
                  }
                }
              } catch (e) {}
            }
          }
        }
      }

      // Vider le reste du buffer vocal s'il restait une phrase sans point final (uniquement en vocal)
      if (
        speechSentenceBufferRef.current.trim() &&
        !isSpeechCancelledRef.current &&
        voiceAudioEnabled &&
        isVoice &&
        spokenSentencesCountRef.current < 1
      ) {
        const remaining = speechSentenceBufferRef.current.trim();
        speechSentenceBufferRef.current = '';
        if (remaining.length > 2 && !remaining.startsWith('```')) {
          spokenSentencesCountRef.current += 1;
          setStreamChunkToSpeak(remaining);
        }
      }

      // Enregistrement final dans l'interface
      if (accumulated) {
        playHudReceive();
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: accumulated,
          clientAction: receivedClientAction,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[CHAT] Requête interrompue par l\'utilisateur');
        return;
      }
      console.error('[CHAT ERROR]', err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Erreur de transmission : ${err.message}. Reconnexion aux circuits auxiliaires.`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  };

  // Actions rapides HUD
  const handleQuickAction = async (action: string) => {
    if (action === 'morning_briefing') {
      setIsLoading(true);
      try {
        const res = await fetch('/api/tools/briefing');
        const data = await res.json();
        if (data.briefing) {
          playHudReceive();
          const msg: Message = {
            id: `briefing-${Date.now()}`,
            role: 'assistant',
            content: `☀️ **MORNING BRIEFING // ${data.timestamp}**\n\n${data.briefing}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, msg]);
          setStreamChunkToSpeak(data.briefing);
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    } else if (action === 'web_search') {
      handleSendMessage('Effectue une recherche Web détaillée sur : ');
    } else if (action === 'calc') {
      handleSendMessage('Calcule et détaille la solution physique ou mathématique pour : ');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#030712] hud-scanline">
      {/* HUD Header avec Réacteur Maître */}
      <Header
        currentModel={currentModel}
        onModelChange={setCurrentModel}
        isListening={isVoiceListening}
        onVoiceCommand={(cmd) => handleSendMessage(cmd, undefined, true)}
        isLoading={isLoading}
        isSpeaking={isSpeaking}
        isVoiceInputActive={isVoiceListening}
        isAwake={isAwake}
        onAwakeChange={setIsAwake}
      />

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Barre de navigation */}
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Vue active */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {activeTab === 'chat' && (
            <>
              <ChatContainer
                messages={messages}
                isLoading={isLoading}
                streamingContent={streamingContent}
                onVoiceCommand={(cmd) => handleSendMessage(cmd, undefined, true)}
                isSpeaking={isSpeaking}
                isAwake={isAwake}
                onTapWake={() => setIsAwake((prev) => !prev)}
                onTabChange={setActiveTab}
              />
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                onQuickAction={handleQuickAction}
                streamChunkToSpeak={streamChunkToSpeak}
                onNewSession={handleNewSession}
                onStopGeneration={handleStopGeneration}
                onSpeakingChange={setIsSpeaking}
                onVoiceListeningChange={setIsVoiceListening}
                onStopSpeakingRef={stopSpeakingRef}
                voiceAudioEnabled={voiceAudioEnabled}
                onToggleVoiceAudio={handleToggleVoiceAudio}
              />
            </>
          )}

          {activeTab === 'memory' && <MemoryView />}
          {activeTab === 'system' && <SystemControlView />}
          {activeTab === 'agent' && <AgentView />}
          {activeTab === 'study' && <StudyView />}
          {activeTab === 'prospection' && <ProspectionView />}
          {activeTab === 'social' && <SocialMediaView />}
          {activeTab === 'english' && <EnglishView />}
          {activeTab === 'tasks' && <TasksView />}
          {activeTab === 'settings' && (
            <SettingsView
              currentModel={currentModel}
              onModelChange={setCurrentModel}
            />
          )}
        </main>
      </div>
    </div>
  );
}

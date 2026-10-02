'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/hud/Header';
import { Navigation, NavTab } from '@/components/hud/Navigation';
import { ChatContainer, Message } from '@/components/chat/ChatContainer';
import { ChatInput } from '@/components/chat/ChatInput';
import { MemoryView } from '@/components/views/MemoryView';
import { AgentView } from '@/components/views/AgentView';
import { StudyView } from '@/components/views/StudyView';
import { ProspectionView } from '@/components/views/ProspectionView';
import { EnglishView } from '@/components/views/EnglishView';
import { TasksView } from '@/components/views/TasksView';
import { SettingsView } from '@/components/views/SettingsView';
import { JARVIS_CONFIG } from '@/lib/config';

export default function JarvisDashboard() {
  const [activeTab, setActiveTab] = useState<NavTab>('chat');
  const [currentModel, setCurrentModel] = useState<string>(JARVIS_CONFIG.defaultFastModel);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [voiceTextToSpeak, setVoiceTextToSpeak] = useState<string>('');

  // Enregistrement du Service Worker PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Échec enregistrement Service Worker:', err);
      });
    }
  }, []);

  // Nouvelle session
  const handleNewSession = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setStreamingContent('');
    setVoiceTextToSpeak('Nouvelle session initialisée, Monsieur. Que puis-je faire pour vous ?');
  }, []);

  // Envoi de message avec streaming SSE
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId,
          model: currentModel,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      // Traitement du flux SSE
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let activeConvId = conversationId;

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
                }
              } catch (e) {
                // fragment partiel
              }
            }
          }
        }
      }

      // Finalisation du message
      if (accumulated) {
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: accumulated,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setVoiceTextToSpeak(accumulated);
      }
    } catch (err: any) {
      console.error('[CHAT ERROR]', err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Erreur de communication avec le cœur système : ${err.message}. Bascule sur les protocoles de secours.`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
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
          const msg: Message = {
            id: `briefing-${Date.now()}`,
            role: 'assistant',
            content: `☀️ **MORNING BRIEFING // ${data.timestamp}**\n\n${data.briefing}`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, msg]);
          setVoiceTextToSpeak(data.briefing);
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    } else if (action === 'web_search') {
      handleSendMessage('Effectue une recherche Web détaillée sur : ');
    } else if (action === 'calc') {
      handleSendMessage('Calcule et explique la solution pour cette expression physique ou mathématique : ');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#030712] hud-scanline">
      {/* HUD Header */}
      <Header
        currentModel={currentModel}
        onModelChange={setCurrentModel}
        isListening={false}
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
              />
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                onQuickAction={handleQuickAction}
                voiceTextToSpeak={voiceTextToSpeak}
                onNewSession={handleNewSession}
              />
            </>
          )}

          {activeTab === 'memory' && <MemoryView />}
          {activeTab === 'agent' && <AgentView />}
          {activeTab === 'study' && <StudyView />}
          {activeTab === 'prospection' && <ProspectionView />}
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

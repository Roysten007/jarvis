'use client';

import React, { useState } from 'react';
import { Languages, Send, Sparkles, MessageCircle } from 'lucide-react';

export function EnglishView() {
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'coach'; text: string }[]>([
    {
      role: 'coach',
      text: "Hello Roysten! I am your Technical English Coach. Practice discussing your coding projects, physics concepts, or everyday engineering situations with me. I'll correct your mistakes and suggest idiomatic phrasing.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage.trim();
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
      setMessages((prev) => [
        ...prev,
        { role: 'coach', text: data.reply || data.error },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'coach', text: `Connection error: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid flex flex-col space-y-4">
      <div className="border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
          <Languages className="w-4 h-4" />
          <span>TECHNICAL ENGLISH COACH // PRATIQUE FLUIDE</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Parlez en anglais avec JARVIS. Il vous répondra en anglais pour entretenir la conversation, tout en vous donnant un retour constructif en français sur vos tournures de phrases.
        </p>
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
            <div className="text-[10px] text-slate-500 mb-1 font-bold">
              {m.role === 'coach' ? 'JARVIS (ENGLISH COACH)' : 'ROYSTEN'}
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
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message in English (e.g., 'I want to optimize my matrix multiplication algorithm...')"
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

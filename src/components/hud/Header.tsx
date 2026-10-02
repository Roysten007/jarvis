'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, Clock, Mic, Sparkles, Activity } from 'lucide-react';
import { JARVIS_CONFIG } from '@/lib/config';

interface HeaderProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  isListening?: boolean;
}

export function Header({ currentModel, onModelChange, isListening = false }: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        new Intl.DateTimeFormat('fr-FR', {
          timeZone: 'Africa/Porto-Novo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(now)
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-[#040814]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 py-2.5 flex items-center justify-between text-xs font-mono select-none sticky top-0 z-40">
      {/* Identifiant & Arc Reactor */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full border border-cyan-400/40 bg-cyan-950/40 shadow-hud-cyan">
          <div className={`w-3.5 h-3.5 rounded-full ${isListening ? 'bg-amber-400 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
          <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-spin-slow" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-widest text-cyan-400 glow-cyan">J.A.R.V.I.S</span>
            <span className="text-[10px] text-slate-500 border border-slate-700 px-1 py-0.2 rounded">v1.0</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SYSTÈME EN LIGNE // ROYSTEN</span>
          </div>
        </div>
      </div>

      {/* Sélecteur de Modèle & Télémétrie */}
      <div className="hidden md:flex items-center gap-4">
        {/* Sélecteur de modèle */}
        <div className="flex items-center gap-1.5 bg-[#0a1122] border border-cyan-500/30 rounded-md px-2 py-1">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="bg-transparent text-slate-200 outline-none cursor-pointer text-[11px]"
          >
            {JARVIS_CONFIG.availableModels.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#090e1a] text-slate-200">
                {m.name} ({m.type === 'reasoning' ? 'Raisonnement' : 'Rapide'})
              </option>
            ))}
          </select>
        </div>

        {/* Télémétrie statut */}
        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-300">NVIDIA NIM: ACTIF</span>
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-300">AUTH: VERROUILLÉE</span>
          </span>
        </div>
      </div>

      {/* Horloge Bénin & Statut Vocal */}
      <div className="flex items-center gap-3">
        {isListening && (
          <div className="flex items-center gap-1 text-amber-400 animate-pulse bg-amber-950/40 border border-amber-500/40 px-2 py-0.5 rounded text-[10px]">
            <Mic className="w-3 h-3" />
            <span>ÉCOUTE ACTIVE</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/30 border border-cyan-500/20 px-2.5 py-1 rounded">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold">{time || '--:--:--'}</span>
          <span className="text-[9px] text-slate-400">BENIN</span>
        </div>
      </div>
    </header>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, Clock, Mic, Sparkles, Activity, Pin, Monitor } from 'lucide-react';
import { JARVIS_CONFIG } from '@/lib/config';

import { ArcReactorWake } from './ArcReactorWake';

interface HeaderProps {
  currentModel: string;
  onModelChange: (model: string) => void;
  isListening?: boolean;
  onVoiceCommand?: (cmd: string) => void;
  isLoading?: boolean;
  isSpeaking?: boolean;
  isVoiceInputActive?: boolean;
  isAwake?: boolean;
  onAwakeChange?: (awake: boolean) => void;
}

export function Header({
  currentModel,
  onModelChange,
  isListening = false,
  onVoiceCommand,
  isLoading = false,
  isSpeaking = false,
  isVoiceInputActive = false,
  isAwake = false,
  onAwakeChange,
}: HeaderProps) {
  const [time, setTime] = useState<string>('');
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      setIsDesktop(true);
      window.electronAPI.getAlwaysOnTop().then((pinned) => {
        setIsAlwaysOnTop(pinned);
      }).catch(() => {});
    }
  }, []);

  const handleTogglePin = async () => {
    if (window.electronAPI?.toggleAlwaysOnTop) {
      const newState = await window.electronAPI.toggleAlwaysOnTop();
      setIsAlwaysOnTop(newState);
    }
  };

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

      {/* Wake Word Engine & Réacteur Vocal Actif 24/7 */}
      {onVoiceCommand && (
        <div className="flex items-center">
          <ArcReactorWake
            compact
            isMaster={true}
            onCommandReceived={onVoiceCommand}
            isProcessing={isLoading}
            isSpeaking={isSpeaking}
            isVoiceInputActive={isVoiceInputActive}
            onAwakeChange={onAwakeChange}
            isAwakeExternal={isAwake}
          />
        </div>
      )}

      {/* Sélecteur de Modèle & Télémétrie */}
      <div className="hidden lg:flex items-center gap-4">
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

      {/* Horloge Bénin & Statut Desktop */}
      <div className="flex items-center gap-3">
        {isDesktop && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePin}
              title={isAlwaysOnTop ? 'Désactiver le premier plan' : 'Garder JARVIS toujours au premier plan'}
              className={`flex items-center gap-1 px-2 py-0.8 rounded text-[10px] border transition-colors ${
                isAlwaysOnTop
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                  : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              <Pin className={`w-3 h-3 ${isAlwaysOnTop ? 'rotate-45 text-cyan-400 fill-cyan-400' : ''}`} />
              <span className="hidden sm:inline">{isAlwaysOnTop ? 'ÉPINGLÉ' : 'ÉPINGLER'}</span>
            </button>
            <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px]">
              <Monitor className="w-3 h-3" />
              <span>DESKTOP APP</span>
              <span className="text-[9px] text-slate-500 ml-1">Ctrl+Shift+J</span>
            </div>
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

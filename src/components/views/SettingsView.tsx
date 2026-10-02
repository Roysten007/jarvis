'use client';

import React, { useState } from 'react';
import { Settings, Download, Trash2, Shield, Cpu, Sparkles, Check, Database, Activity } from 'lucide-react';
import { JARVIS_CONFIG } from '@/lib/config';

interface SettingsViewProps {
  currentModel: string;
  onModelChange: (model: string) => void;
}

export function SettingsView({ currentModel, onModelChange }: SettingsViewProps) {
  const [systemPrompt, setSystemPrompt] = useState(JARVIS_CONFIG.defaultSystemPrompt);
  const [savedPrompt, setSavedPrompt] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleSavePrompt = () => {
    localStorage.setItem('jarvis_custom_system_prompt', systemPrompt);
    setSavedPrompt(true);
    setTimeout(() => setSavedPrompt(false), 2500);
  };

  const handleExportData = () => {
    window.open('/api/export', '_blank');
  };

  const handleReset = async () => {
    if (resetConfirm !== 'RESET_JARVIS_DEFINITIF') {
      alert('Veuillez taper exactement : RESET_JARVIS_DEFINITIF pour confirmer.');
      return;
    }

    if (!confirm('ATTENTION : Cette action supprimera irréversiblement toutes vos conversations, mémoires et tâches locales.')) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: resetConfirm }),
      });
      if (res.ok) {
        alert('Toutes les données ont été réinitialisées.');
        window.location.reload();
      }
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid space-y-6">
      <div className="border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
          <Settings className="w-4 h-4" />
          <span>PARAMÈTRES SYSTÈME & ADMINISTRATION // ROYSTEN</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Configurez l'intelligence de JARVIS, ajustez le prompt système de personnalité, exportez vos données ou gérez les quotas.
        </p>
      </div>

      {/* État des services */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="hud-panel p-4 rounded-lg border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>INFRASTRUCTURE IA</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-300">NVIDIA NIM OPERATIONAL</div>
          <div className="text-[10px] text-slate-400">Modèle actif : {currentModel.split('/')[1] || currentModel}</div>
        </div>

        <div className="hud-panel p-4 rounded-lg border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>BASE DE DONNÉES</span>
            <Database className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-cyan-300">SUPABASE + PGVECTOR</div>
          <div className="text-[10px] text-slate-400">Mode hybride avec résilience locale</div>
        </div>

        <div className="hud-panel p-4 rounded-lg border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>AUTHENTIFICATION</span>
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-indigo-300">ACCÈS PRIVÉ UNIQUE</div>
          <div className="text-[10px] text-slate-400 truncate">{JARVIS_CONFIG.userEmail}</div>
        </div>
      </div>

      {/* Sélection de modèle */}
      <div className="hud-panel p-4 rounded-lg border-cyan-500/20 space-y-3">
        <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Sélection du Moteur LLM par défaut :</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {JARVIS_CONFIG.availableModels.map((m) => (
            <div
              key={m.id}
              onClick={() => onModelChange(m.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                currentModel === m.id
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-hud-cyan'
                  : 'border-slate-800 bg-[#070b16] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100">{m.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 uppercase">
                  {m.type}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Personnalité & Prompt Système */}
      <div className="hud-panel p-4 rounded-lg border-cyan-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Directives & Personnalité de JARVIS (Prompt Système) :</span>
          </div>
          {savedPrompt && (
            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
              <Check className="w-3.5 h-3.5" />
              <span>Enregistré !</span>
            </span>
          )}
        </div>

        <textarea
          rows={6}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full bg-[#070b16] border border-cyan-500/30 rounded p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-400 leading-relaxed font-mono"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setSystemPrompt(JARVIS_CONFIG.defaultSystemPrompt)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-400 rounded hover:text-slate-200"
          >
            Réinitialiser au défaut
          </button>
          <button
            type="button"
            onClick={handleSavePrompt}
            className="px-4 py-1.5 bg-cyan-500/20 border border-cyan-400 text-cyan-300 rounded hover:bg-cyan-500/30 font-bold shadow-hud-cyan"
          >
            Sauvegarder les directives
          </button>
        </div>
      </div>

      {/* Export & Réinitialisation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export JSON */}
        <div className="hud-panel p-4 rounded-lg border-cyan-500/20 space-y-2">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Exportation intégrale des données</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            Téléchargez une archive complète en JSON contenant toutes vos conversations, vos souvenirs et vos missions.
          </p>
          <button
            type="button"
            onClick={handleExportData}
            className="mt-2 bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1.5 rounded hover:border-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger l'archive JSON</span>
          </button>
        </div>

        {/* Purge des données */}
        <div className="hud-panel p-4 rounded-lg border-rose-500/30 space-y-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
            <Trash2 className="w-4 h-4" />
            <span>Zone Dangereuse : Purge du système</span>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            Pour réinitialiser définitivement le stockage, tapez <code className="text-rose-300">RESET_JARVIS_DEFINITIF</code> :
          </p>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET_JARVIS_DEFINITIF"
              className="flex-1 bg-[#090e1a] border border-rose-500/30 rounded px-2.5 py-1 text-xs text-rose-200 outline-none focus:border-rose-400"
            />
            <button
              type="button"
              disabled={isResetting || resetConfirm !== 'RESET_JARVIS_DEFINITIF'}
              onClick={handleReset}
              className="bg-rose-500/20 border border-rose-500 text-rose-300 px-3 py-1 rounded hover:bg-rose-500/30 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
            >
              Purger
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

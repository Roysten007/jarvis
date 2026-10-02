'use client';

import React, { useState } from 'react';
import { GraduationCap, BookOpen, FileText, CheckCircle2, Zap, Atom } from 'lucide-react';

export function StudyView() {
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<'explain' | 'exercise' | 'quiz'>('explain');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const presets = [
    'Équations de Maxwell et propagation des ondes EM',
    'Théorème de Gauss et champ électrostatique',
    'Diagonalisation des matrices et espaces propres',
    'Rendement thermodynamique des panneaux photovoltaïques',
    'Circuits RLC en régime transitoire et alternatif',
  ];

  const handleStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/modules/study', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), mode }),
      });
      const data = await res.json();
      setResult(data.result || data.error);
    } catch (e: any) {
      setResult(`Erreur de connexion au module d'études: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid space-y-6">
      {/* En-tête */}
      <div className="border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
          <GraduationCap className="w-4 h-4" />
          <span>MODULE D'ÉTUDES SCIENTIFIQUES // MATHS & PHYSIQUE</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Tuteur scientifique d'élite propulsé par Nemotron 550B. Dédié à votre cursus universitaire (Mathématiques, Physique, Électrostatique, Énergie).
        </p>
      </div>

      {/* Formulaire de requête */}
      <form onSubmit={handleStudy} className="hud-panel p-4 rounded-lg border-cyan-500/30 space-y-4">
        {/* Choix du mode */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('explain')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all ${
              mode === 'explain'
                ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-hud-cyan font-bold'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Explication approfondie</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('exercise')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all ${
              mode === 'exercise'
                ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-hud-emerald font-bold'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Fiche d'exercices & Corrigé</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('quiz')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all ${
              mode === 'quiz'
                ? 'bg-amber-500/20 border border-amber-400 text-amber-300 shadow-hud-amber font-bold'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Quiz rapide</span>
          </button>
        </div>

        {/* Sujet */}
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Concept ou Sujet d'étude :</label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="ex: Théorème d'Ampère, Résolution d'équations différentielles d'ordre 2..."
              className="flex-1 bg-[#090e1a] border border-cyan-500/30 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="bg-cyan-500/20 border border-cyan-400 text-cyan-300 px-4 py-2 rounded flex items-center gap-1.5 hover:bg-cyan-500/30 transition-all shadow-hud-cyan disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{loading ? 'Calcul...' : 'Lancer'}</span>
            </button>
          </div>
        </div>

        {/* Suggestions rapides */}
        <div>
          <span className="text-[10px] text-slate-500 block mb-1">Suggestions rapides :</span>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setTopic(p)}
                className="bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 px-2 py-0.5 rounded hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </form>

      {/* Résultat */}
      {result && (
        <div className="hud-panel p-5 rounded-lg border-cyan-500/30 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs glow-cyan">
            <Atom className="w-4 h-4" />
            <span>SYNTHÈSE DU PROFESSEUR JARVIS // {topic}</span>
          </div>
          <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans border-t border-cyan-500/20 pt-3">
            {result}
          </div>
        </div>
      )}
    </div>
  );
}

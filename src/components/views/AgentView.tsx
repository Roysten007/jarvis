'use client';

import React, { useState } from 'react';
import { Zap, Play, Square, CheckCircle, AlertTriangle, Terminal, ArrowRight, ShieldAlert } from 'lucide-react';

interface AgentStep {
  step: number;
  thought: string;
  action?: string;
  actionInput?: any;
  observation?: any;
  status: 'running' | 'completed' | 'error';
}

export function AgentView() {
  const [goal, setGoal] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [finalReport, setFinalReport] = useState<string | null>(null);

  const startAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim() || isRunning) return;

    setIsRunning(true);
    setSteps([]);
    setFinalReport(null);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim() }),
      });

      const data = await res.json();
      if (data.steps) {
        setSteps(data.steps);
      }
      if (data.finalAnswer) {
        setFinalReport(data.finalAnswer);
      }
    } catch (e: any) {
      console.error(e);
      setFinalReport(`Erreur lors de l'exécution de l'agent : ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid space-y-6">
      {/* En-tête */}
      <div className="border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>MOTEUR AGENT AUTONOME // PROTOCOLE REACT</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Confiez un objectif complexe à JARVIS. Le système le décomposera en sous-tâches, exécutera les outils nécessaires (recherche, calcul, planification), observera les retours et vous livrera un rapport complet.
        </p>
      </div>

      {/* Saisie de l'objectif */}
      <form onSubmit={startAgent} className="hud-panel p-4 rounded-lg border-cyan-500/30 space-y-3">
        <label className="block text-[11px] text-slate-300 font-bold">
          DÉFINIR L'OBJECTIF MAÎTRE :
        </label>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            required
            disabled={isRunning}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="ex: Analyse les tendances de la tech au Bénin en 2026 et crée 3 idées de projets viables avec une tâche de suivi."
            className="flex-1 bg-[#090e1a] border border-cyan-500/30 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 focus:shadow-hud-cyan"
          />
          {isRunning ? (
            <button
              type="button"
              onClick={handleStop}
              className="bg-rose-500/20 border border-rose-500 text-rose-300 px-4 py-2 rounded flex items-center justify-center gap-1.5 hover:bg-rose-500/30 transition-all font-bold"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Interrompre</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!goal.trim()}
              className="bg-cyan-500/20 border border-cyan-400 text-cyan-300 px-5 py-2 rounded flex items-center justify-center gap-1.5 hover:bg-cyan-500/30 transition-all shadow-hud-cyan font-bold disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Déployer l'Agent</span>
            </button>
          )}
        </div>
      </form>

      {/* État de fonctionnement en direct */}
      {isRunning && (
        <div className="p-3 bg-cyan-950/30 border border-cyan-500/40 rounded-lg flex items-center gap-3 text-cyan-300 animate-pulse">
          <Terminal className="w-4 h-4 animate-spin-slow" />
          <span>JARVIS exécute la boucle ReAct (Planification → Action → Observation)...</span>
        </div>
      )}

      {/* Journal des étapes ReAct */}
      {steps.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 tracking-wider">
            // JOURNAL D'EXÉCUTION DES ÉTAPES :
          </div>

          {steps.map((st) => (
            <div key={st.step} className="hud-panel p-3.5 rounded-lg border-cyan-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="bg-cyan-950 border border-cyan-500/40 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-bold">
                  ÉTAPE {st.step}
                </span>
                <span className={`text-[10px] ${st.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {st.status.toUpperCase()}
                </span>
              </div>

              {/* Raisonnement / Pensée */}
              <div>
                <span className="text-[10px] text-slate-500 font-bold block">PENSÉE / ANALYSE :</span>
                <p className="text-xs text-slate-300 font-sans mt-0.5">{st.thought}</p>
              </div>

              {/* Action invoquée */}
              {st.action && (
                <div className="bg-[#060b17] border border-slate-800 p-2 rounded">
                  <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold">
                    <ArrowRight className="w-3 h-3" />
                    <span>OUTIL INVOQUÉ : {st.action}</span>
                  </div>
                  {st.actionInput && (
                    <pre className="text-[10px] text-slate-400 mt-1 overflow-x-auto">
                      {JSON.stringify(st.actionInput, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Observation / Résultat */}
              {st.observation && (
                <div className="bg-[#050e18] border border-emerald-500/20 p-2 rounded">
                  <span className="text-[10px] text-emerald-400 font-bold block">OBSERVATION :</span>
                  <pre className="text-[10px] text-slate-300 mt-1 overflow-x-auto whitespace-pre-wrap font-sans">
                    {typeof st.observation === 'object'
                      ? JSON.stringify(st.observation, null, 2)
                      : String(st.observation)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rapport final */}
      {finalReport && (
        <div className="hud-panel p-5 rounded-lg border-emerald-500/40 bg-emerald-950/10 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs glow-emerald">
            <CheckCircle className="w-4 h-4" />
            <span>RAPPORT FINAL DE MISSION // JARVIS</span>
          </div>
          <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans border-t border-emerald-500/20 pt-3">
            {finalReport}
          </div>
        </div>
      )}
    </div>
  );
}

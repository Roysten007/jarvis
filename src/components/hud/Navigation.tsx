'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Brain,
  Zap,
  Monitor,
  GraduationCap,
  TrendingUp,
  Share2,
  Languages,
  CheckSquare,
  Settings,
  MoreHorizontal,
  X,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'chat'
  | 'memory'
  | 'agent'
  | 'system'
  | 'study'
  | 'prospection'
  | 'social'
  | 'english'
  | 'tasks'
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const TABS = [
  { id: 'chat' as NavTab, label: 'Terminal', desc: 'Assistant IA conversationnel & vocal', icon: MessageSquare },
  { id: 'social' as NavTab, label: 'WhatsApp & Social', desc: 'Envoi messages & posts réseaux', icon: Share2 },
  { id: 'prospection' as NavTab, label: 'Prospection', desc: 'CRM & génération de leads qualifiés', icon: TrendingUp },
  { id: 'system' as NavTab, label: 'Pilote PC', desc: 'Contrôle Windows, apps & capture écran', icon: Monitor },
  { id: 'study' as NavTab, label: 'Études', desc: 'Maths, physique & informatique Roysten', icon: GraduationCap },
  { id: 'memory' as NavTab, label: 'Mémoire', desc: 'Faits et profil de Roysten mémorisés', icon: Brain },
  { id: 'agent' as NavTab, label: 'Agent ReAct', desc: 'Planification et exécution autonome', icon: Zap },
  { id: 'english' as NavTab, label: 'Anglais', desc: 'Perfectionnement bilingue & tech', icon: Languages },
  { id: 'tasks' as NavTab, label: 'Missions', desc: 'To-do list & objectifs quotidiens', icon: CheckSquare },
  { id: 'settings' as NavTab, label: 'Paramètres', desc: 'Modèles IA, clés & configuration', icon: Settings },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const primaryTabs: NavTab[] = ['chat', 'social', 'prospection', 'system'];
  const isSecondaryActive = !primaryTabs.includes(activeTab);

  return (
    <>
      {/* 1. NAVIGATION DESKTOP (Sidebar gauche classique) */}
      <nav className="hidden md:flex flex-col w-56 bg-[#040814]/95 border-r border-cyan-500/20 p-2 gap-1 select-none shrink-0 z-30">
        <div className="px-3 py-2 text-[10px] font-mono tracking-widest text-slate-500 uppercase">
          // MODULES SYSTÈME
        </div>

        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md font-mono text-xs transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 shadow-hud-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 2. NAVIGATION MOBILE (Barre compacte haute ergonomique) */}
      <nav className="md:hidden w-full bg-[#040814]/98 border-b border-cyan-500/20 px-2 py-1.5 flex items-center justify-between gap-1 select-none z-30 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
          {primaryTabs.map((tabId) => {
            const tab = TABS.find((t) => t.id === tabId)!;
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[11px] transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-hud-cyan font-bold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bouton Plus / Tiroir Modules */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-mono text-[11px] transition-all whitespace-nowrap shrink-0 border ${
            isSecondaryActive
              ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_10px_rgba(251,191,36,0.3)] font-bold'
              : 'text-slate-300 bg-slate-900/80 border-slate-700 hover:border-cyan-400'
          }`}
          title="Plus de modules (Études, Mémoire, ReAct, Paramètres)"
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>{isSecondaryActive ? TABS.find((t) => t.id === activeTab)?.label : 'Plus'}</span>
        </button>
      </nav>

      {/* 3. TIROIR MODAL MOBILE (Drawer pour accéder à tous les 10 modules facilement) */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-fadeIn"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="bg-[#060c1d] border-t border-cyan-500/40 rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header tiroir */}
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider">
                  CENTRE DE CONTRÔLE // ROYSTEN
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grille des modules */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id);
                      setDrawerOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-hud-cyan'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${
                        isActive ? 'bg-cyan-950 border-cyan-400/50 text-cyan-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold">{tab.label}</div>
                        <div className="text-[10px] text-slate-400">{tab.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-600'}`} />
                  </button>
                );
              })}
            </div>

            <div className="pt-2 text-center text-[10px] font-mono text-slate-500">
              JARVIS v1.0 • OPTIMISÉ ROYSTEN MOBILE & DESKTOP
            </div>
          </div>
        </div>
      )}
    </>
  );
}

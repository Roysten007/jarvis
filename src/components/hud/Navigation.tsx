'use client';

import React from 'react';
import {
  MessageSquare,
  Brain,
  Zap,
  GraduationCap,
  TrendingUp,
  Languages,
  CheckSquare,
  Settings,
} from 'lucide-react';

export type NavTab =
  | 'chat'
  | 'memory'
  | 'agent'
  | 'study'
  | 'prospection'
  | 'english'
  | 'tasks'
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const TABS = [
  { id: 'chat' as NavTab, label: 'Terminal', icon: MessageSquare },
  { id: 'memory' as NavTab, label: 'Mémoire', icon: Brain },
  { id: 'agent' as NavTab, label: 'Agent', icon: Zap },
  { id: 'study' as NavTab, label: 'Études', icon: GraduationCap },
  { id: 'prospection' as NavTab, label: 'Prospection', icon: TrendingUp },
  { id: 'english' as NavTab, label: 'Anglais', icon: Languages },
  { id: 'tasks' as NavTab, label: 'Missions', icon: CheckSquare },
  { id: 'settings' as NavTab, label: 'Paramètres', icon: Settings },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="w-full bg-[#040814]/95 border-b md:border-b-0 md:border-r border-cyan-500/20 md:w-56 flex md:flex-col justify-around md:justify-start p-2 gap-1 select-none overflow-x-auto shrink-0 z-30">
      <div className="hidden md:block px-3 py-2 text-[10px] font-mono tracking-widest text-slate-500 uppercase">
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
  );
}

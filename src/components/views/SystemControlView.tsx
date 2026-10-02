'use client';

import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Cpu,
  HardDrive,
  Folder,
  Globe,
  Terminal,
  Play,
  CheckCircle,
  ExternalLink,
  Smartphone,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface SystemStats {
  hostname: string;
  platform: string;
  uptimeHours: number;
  totalRamGb: number;
  usedRamGb: number;
  freeRamGb: number;
  ramPercent: number;
  cpusCount: number;
  cpuModel: string;
}

export function SystemControlView() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [targetUrl, setTargetUrl] = useState('');
  const [customApp, setCustomApp] = useState('');
  const [folderItems, setFolderItems] = useState<{ directory: string; items: any[] } | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/control');
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunch = async (appName: string, targetPath?: string) => {
    setStatusMessage(`Ordre de lancement transmis pour "${appName}"...`);
    try {
      const res = await fetch('/api/system/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launch_app', appName, targetPath }),
      });
      const data = await res.json();
      setStatusMessage(data.message || 'Application lancée.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e: any) {
      setStatusMessage(`Erreur : ${e.message}`);
    }
  };

  const handleOpenUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;

    try {
      const res = await fetch('/api/system/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open_url', url: targetUrl.trim() }),
      });
      const data = await res.json();
      setStatusMessage(data.message);
      setTargetUrl('');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e: any) {
      setStatusMessage(`Erreur : ${e.message}`);
    }
  };

  const handleBrowseDocuments = async () => {
    try {
      const res = await fetch('/api/system/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'browse_folder' }),
      });
      const data = await res.json();
      setFolderItems(data);
    } catch (e) {
      console.error(e);
    }
  };

  const [whatsAppContact, setWhatsAppContact] = useState('Roysten');
  const [whatsAppMsg, setWhatsAppMsg] = useState('Salut Roysten ! Le système JARVIS est opérationnel.');
  const [spotifyQuery, setSpotifyQuery] = useState('');

  const handleWhatsAppAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(`Préparation du message WhatsApp pour "${whatsAppContact}"...`);
    try {
      const res = await fetch('/api/system/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'whatsapp_message',
          contactOrPhone: whatsAppContact,
          messageText: whatsAppMsg,
        }),
      });
      const data = await res.json();
      setStatusMessage(data.message || 'WhatsApp ouvert avec le message pré-rempli.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e: any) {
      setStatusMessage(`Erreur : ${e.message}`);
    }
  };

  const handleSpotifyAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(spotifyQuery ? `Recherche "${spotifyQuery}" sur Spotify...` : 'Lancement de Spotify...');
    try {
      const res = await fetch('/api/system/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'play_spotify',
          query: spotifyQuery,
        }),
      });
      const data = await res.json();
      setStatusMessage(data.message || 'Spotify activé au premier plan.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (e: any) {
      setStatusMessage(`Erreur : ${e.message}`);
    }
  };

  const defaultApps = [
    { id: 'vscode', name: 'VS Code', label: 'Projet Jarvis (IDE)', icon: Terminal, color: 'text-cyan-400' },
    { id: 'spotify', name: 'Spotify', label: 'Musique & Focus', icon: Play, color: 'text-emerald-400' },
    { id: 'whatsapp', name: 'WhatsApp', label: 'Messagerie Desktop', icon: Smartphone, color: 'text-emerald-500' },
    { id: 'canva', name: 'Canva', label: 'Design graphique', icon: Sparkles, color: 'text-purple-400' },
    { id: 'capcut', name: 'CapCut', label: 'Montage vidéo', icon: Play, color: 'text-rose-400' },
    { id: 'word', name: 'Microsoft Word', label: 'Traitement de texte', icon: Monitor, color: 'text-blue-400' },
    { id: 'excel', name: 'Microsoft Excel', label: 'Tableur & Data', icon: Monitor, color: 'text-emerald-400' },
    { id: 'powerpoint', name: 'PowerPoint', label: 'Diaporamas & Pitch', icon: Monitor, color: 'text-orange-400' },
    { id: 'chrome', name: 'Google Chrome', label: 'Navigateur Web', icon: Globe, color: 'text-amber-400' },
    { id: 'explorer', name: 'Mes Documents', label: 'Explorateur Windows', icon: Folder, color: 'text-emerald-300' },
    { id: 'youtube', name: 'YouTube', label: 'Vidéos & Tutos', icon: Play, color: 'text-rose-500' },
    { id: 'terminal', name: 'PowerShell', label: 'Terminal système', icon: Terminal, color: 'text-cyan-300' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
            <Monitor className="w-4 h-4" />
            <span>PILOTE ORDINATEUR & SYSTÈME // ACCÈS TOTAL</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            JARVIS a le contrôle direct de votre machine ({stats?.hostname || 'DESKTOP'}). Vous lui dites quoi ouvrir ou exécuter, il l'exécute immédiatement.
          </p>
        </div>

        <button
          onClick={fetchStats}
          className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1.5 rounded text-slate-300 hover:border-cyan-400 text-[11px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Rafraîchir Télémétrie</span>
        </button>
      </div>

      {/* Message de notification d'action */}
      {statusMessage && (
        <div className="p-3 bg-cyan-950/40 border border-cyan-400/50 rounded-lg flex items-center gap-2 text-cyan-300 shadow-hud-cyan animate-pulse">
          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Télémétrie Matérielle en Direct */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="hud-panel p-3.5 rounded-lg border-cyan-500/30">
            <div className="text-[10px] text-slate-400">ORDINATEUR CIBLE</div>
            <div className="text-sm font-bold text-cyan-300 truncate mt-1">{stats.hostname}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{stats.platform}</div>
          </div>

          <div className="hud-panel p-3.5 rounded-lg border-cyan-500/30">
            <div className="text-[10px] text-slate-400">PROCESSEUR</div>
            <div className="text-xs font-bold text-emerald-300 truncate mt-1">{stats.cpuModel.split('@')[0]}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{stats.cpusCount} cœurs logiques</div>
          </div>

          <div className="hud-panel p-3.5 rounded-lg border-cyan-500/30">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>RAM SYSTÈME</span>
              <span className="text-cyan-300 font-bold">{stats.ramPercent}%</span>
            </div>
            <div className="text-sm font-bold text-slate-200 mt-1">
              {stats.usedRamGb} / {stats.totalRamGb} Go
            </div>
            {/* Barre de progression néon */}
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5 border border-slate-700">
              <div
                className="bg-cyan-400 h-full shadow-hud-cyan transition-all duration-500"
                style={{ width: `${stats.ramPercent}%` }}
              />
            </div>
          </div>

          <div className="hud-panel p-3.5 rounded-lg border-cyan-500/30">
            <div className="text-[10px] text-slate-400">TEMPS DE FONCTIONNEMENT</div>
            <div className="text-sm font-bold text-amber-300 mt-1">{stats.uptimeHours} heures</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Système stable</div>
          </div>
        </div>
      )}

      {/* Lanceurs d'Applications en 1 Clic */}
      <div className="hud-panel p-5 rounded-lg border-cyan-500/20 space-y-3">
        <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>APPLICATIONS DU PC ACCESSIBLES EN 1 CLIC (OU À LA VOIX) :</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Vous pouvez cliquer sur ces raccourcis ou simplement dire à l'oral : <em>« Jarvis, ouvre VS Code »</em>, <em>« Jarvis, mets du Burna Boy sur Spotify »</em> ou <em>« Jarvis, écris un message à Roysten sur WhatsApp »</em>.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {defaultApps.map((app) => {
            const Icon = app.icon;
            return (
              <button
                key={app.id}
                onClick={() => handleLaunch(app.id)}
                className="p-3 bg-[#080d1b] border border-cyan-500/20 rounded-lg hover:border-cyan-400 hover:shadow-hud-cyan transition-all text-left flex items-start gap-2.5 group"
              >
                <Icon className={`w-5 h-5 ${app.color} shrink-0 mt-0.5 group-hover:scale-110 transition-transform`} />
                <div>
                  <div className="font-bold text-slate-200 text-xs">{app.name}</div>
                  <div className="text-[10px] text-slate-500">{app.label}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Lancer une application personnalisée par commande */}
        <div className="pt-3 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={customApp}
            onChange={(e) => setCustomApp(e.target.value)}
            placeholder="Nom d'une autre application (ex: figma, blender, gitk, word)..."
            className="flex-1 bg-[#090e1a] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
          />
          <button
            onClick={() => {
              if (customApp.trim()) {
                handleLaunch(customApp.trim());
                setCustomApp('');
              }
            }}
            className="px-4 py-1.5 bg-cyan-500/20 border border-cyan-400 text-cyan-300 rounded hover:bg-cyan-500/30 text-xs font-bold"
          >
            Lancer
          </button>
        </div>
      </div>

      {/* ACTION WHATSAPP DIRECTE */}
      <div className="hud-panel p-5 rounded-lg border-emerald-500/30 bg-emerald-950/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <Smartphone className="w-4 h-4" />
            <span>ACTION WHATSAPP : RÉDIGER & ENVOYER SUR L'ORDINATEUR</span>
          </div>
          <span className="text-[10px] text-emerald-500/80 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
            Focus Premier Plan
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Demandez vocalement : <em>« Jarvis, écris un message à Roysten sur WhatsApp : salut boss »</em> ou remplissez ci-dessous :
        </p>

        <form onSubmit={handleWhatsAppAction} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Destinataire ou Numéro :</label>
              <input
                type="text"
                value={whatsAppContact}
                onChange={(e) => setWhatsAppContact(e.target.value)}
                placeholder="ex: Roysten ou +22997000000"
                className="w-full bg-[#080e1a] border border-emerald-500/30 rounded px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] text-slate-400 block mb-1">Message à préparer :</label>
              <input
                type="text"
                value={whatsAppMsg}
                onChange={(e) => setWhatsAppMsg(e.target.value)}
                placeholder="Tapez le message..."
                className="w-full bg-[#080e1a] border border-emerald-500/30 rounded px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1.5 text-[10px] text-slate-400">
              <span className="text-slate-500">Exemples :</span>
              <button
                type="button"
                onClick={() => setWhatsAppMsg('Salut bro, le projet Jarvis avance super bien !')}
                className="hover:text-emerald-300 underline"
              >
                Projet Jarvis
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setWhatsAppMsg('Dispo pour un call vocal ?')}
                className="hover:text-emerald-300 underline"
              >
                Call
              </button>
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded hover:bg-emerald-500/30 text-xs font-bold flex items-center gap-1.5 shadow-hud-cyan"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Ouvrir & Rédiger sur WhatsApp</span>
            </button>
          </div>
        </form>
      </div>

      {/* ACTION SPOTIFY DIRECTE */}
      <div className="hud-panel p-5 rounded-lg border-cyan-500/30 bg-[#080d1b] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
            <Play className="w-4 h-4 text-emerald-400" />
            <span>ACTION SPOTIFY : RECHERCHER & JOUER DE LA MUSIQUE</span>
          </div>
          <span className="text-[10px] text-cyan-400/80 bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded">
            Desktop & Web
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Dites : <em>« Jarvis, mets de la musique lofi sur Spotify »</em> ou <em>« Jarvis, mets Burna Boy »</em> :
        </p>

        <form onSubmit={handleSpotifyAction} className="flex gap-2">
          <input
            type="text"
            value={spotifyQuery}
            onChange={(e) => setSpotifyQuery(e.target.value)}
            placeholder="Artiste, titre ou ambiance (ex: Burna Boy, Lofi Hip Hop, Rema, Hans Zimmer)..."
            className="flex-1 bg-[#090e1a] border border-cyan-500/30 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded hover:bg-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span>Lancer sur Spotify</span>
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
          {['Burna Boy', 'Lofi Beats', 'Hans Zimmer', 'Afrobeat 2026', 'Deep Focus'].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setSpotifyQuery(tag);
                handleLaunch('spotify');
              }}
              className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 hover:border-emerald-400 text-slate-300 hover:text-emerald-300 text-[10px]"
            >
              🎵 {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Ouverture d'URL dans le navigateur de l'ordinateur */}
      <form onSubmit={handleOpenUrl} className="hud-panel p-4 rounded-lg border-cyan-500/20 space-y-2">
        <label className="text-cyan-300 font-bold block text-xs">
          OUVRIR UN SITE DIRECTEMENT SUR L'ÉCRAN :
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="ex: youtube.com, github.com/trending, uac.bj..."
            className="flex-1 bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-cyan-500/20 border border-cyan-400 text-cyan-300 rounded hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-1.5 shadow-hud-cyan"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ouvrir sur le PC</span>
          </button>
        </div>
      </form>

      {/* Explorateur de fichiers Documents */}
      <div className="hud-panel p-4 rounded-lg border-cyan-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-cyan-300 font-bold text-xs flex items-center gap-2">
            <Folder className="w-4 h-4 text-emerald-400" />
            <span>FICHIERS LOCAUX DE ROYSTEN (DOSSIER DOCUMENTS)</span>
          </div>
          <button
            onClick={handleBrowseDocuments}
            className="px-3 py-1 bg-slate-900 border border-slate-700 text-slate-300 rounded hover:border-emerald-400 text-[11px]"
          >
            Inspecter le dossier
          </button>
        </div>

        {folderItems && (
          <div className="bg-[#070b16] p-3 rounded border border-slate-800 space-y-1.5 max-h-48 overflow-y-auto">
            <div className="text-[10px] text-slate-500">Emplacement : {folderItems.directory}</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 pt-1">
              {folderItems.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/60 p-1.5 rounded truncate"
                >
                  <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contrôle depuis le Téléphone (Pont Mobile) */}
      <div className="hud-panel p-5 rounded-lg border-emerald-500/30 bg-emerald-950/10 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
          <Smartphone className="w-4 h-4" />
          <span>CONTRÔLE DEPUIS LE TÉLÉPHONE (PONT MOBILE)</span>
        </div>
        <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
          Pour piloter JARVIS depuis votre téléphone dans la même pièce ou sur le même Wi-Fi :
        </p>
        <div className="bg-[#060e18] p-3 rounded border border-emerald-500/30 space-y-1 text-xs">
          <div>
            👉 Adresse locale pour votre téléphone :{' '}
            <strong className="text-cyan-300 font-mono">http://10.140.207.85:3000</strong>
          </div>
          <div className="text-[10px] text-slate-400">
            Ouvrez ce lien dans le navigateur de votre téléphone. Vous pourrez alors parler à JARVIS, et il exécutera les commandes sur votre ordinateur à distance !
          </div>
        </div>
      </div>
    </div>
  );
}

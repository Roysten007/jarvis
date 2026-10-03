'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  MessageSquare,
  Instagram,
  MapPin,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Users,
  Calendar,
  Smartphone,
  Briefcase,
  Play,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Send,
} from 'lucide-react';

interface Prospect {
  id: string;
  name: string;
  channel: 'whatsapp' | 'instagram' | 'maps';
  contact: string;
  businessName?: string;
  city?: string;
  status: 'nouveau' | 'contacte_1' | 'relance_2' | 'converti' | 'archive';
  message1: string;
  message2: string;
  notes?: string;
  createdAt: string;
}

interface RoystenOffer {
  id: string;
  name: string;
  priceFcfa: number;
  priceRange: string;
  description: string;
  deliverables: string[];
  targetAudience: string;
}

interface CourseSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  location?: string;
}

export function ProspectionView() {
  const [activeTab, setActiveTab] = useState<'agents' | 'crm' | 'profile' | 'schedule' | 'mobile'>('agents');
  const [selectedAgent, setSelectedAgent] = useState<'whatsapp' | 'instagram' | 'maps'>('whatsapp');

  // État Agent WhatsApp
  const [waProspect, setWaProspect] = useState({
    name: '',
    phone: '',
    businessName: '',
    niche: 'Restaurant / Commerce',
    observation: 'Pas de menu digital visible sur WhatsApp ni de site rapide',
    offerId: 'oresto-connect',
  });

  // État Agent Instagram
  const [igProspect, setIgProspect] = useState({
    handle: '',
    niche: 'Créateur / E-commerce',
    recentHook: 'Reel récent sur ses coulisses de vente sans lien direct',
    goal: 'Vendre une landing page haute conversion',
  });

  // État Agent Google Maps
  const [mapsProspect, setMapsProspect] = useState({
    businessName: '',
    category: 'Restaurant & Bar Lounge',
    city: 'Cotonou',
    missingItem: 'Aucun site internet répertorié sur la fiche Maps',
  });

  // Données serveur
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [localIp, setLocalIp] = useState<string>('localhost');
  const [schedule, setSchedule] = useState<CourseSlot[]>([]);
  const [dayToOptimize, setDayToOptimize] = useState<string>('Lundi');
  const [dayPlan, setDayPlan] = useState<string | null>(null);

  // Génération
  const [loading, setLoading] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<{ message1: string; message2: string; diagnostic?: string; clickUrl?: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Charger les données initiales
  const loadInitialData = async () => {
    try {
      const res = await fetch('/api/prospector');
      const data = await res.json();
      if (data.prospects) setProspects(data.prospects);
      if (data.profile) {
        setProfile(data.profile);
        if (data.profile.schedule) setSchedule(data.profile.schedule);
      }
      if (data.localIp) setLocalIp(data.localIp);
    } catch (e) {
      console.warn('Erreur chargement données prospection:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Exécution de l'Agent WhatsApp
  const handleRunWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setGeneratedOutput(null);

    try {
      const res = await fetch('/api/prospector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_whatsapp_agent',
          prospectName: waProspect.phone || waProspect.name,
          businessName: waProspect.businessName || waProspect.name,
          niche: waProspect.niche,
          specificObservation: waProspect.observation,
          targetOfferId: waProspect.offerId,
        }),
      });
      const data = await res.json();
      if (data.message1) {
        setGeneratedOutput({
          message1: data.message1,
          message2: data.message2,
          clickUrl: data.clickUrl,
        });
        loadInitialData();
      }
    } catch (err: any) {
      alert(`Erreur Agent WhatsApp: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Exécution de l'Agent Instagram
  const handleRunInstagram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setGeneratedOutput(null);

    try {
      const res = await fetch('/api/prospector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_instagram_agent',
          handleOrName: igProspect.handle,
          creatorNiche: igProspect.niche,
          recentContentHook: igProspect.recentHook,
          goal: igProspect.goal,
        }),
      });
      const data = await res.json();
      if (data.message1) {
        setGeneratedOutput({
          message1: data.message1,
          message2: data.message2,
        });
        loadInitialData();
      }
    } catch (err: any) {
      alert(`Erreur Agent Instagram: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Exécution de l'Agent Google Maps
  const handleRunMaps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setGeneratedOutput(null);

    try {
      const res = await fetch('/api/prospector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'run_maps_agent',
          businessName: mapsProspect.businessName,
          category: mapsProspect.category,
          city: mapsProspect.city,
          observedMissingItem: mapsProspect.missingItem,
        }),
      });
      const data = await res.json();
      if (data.message1) {
        setGeneratedOutput({
          message1: data.message1,
          message2: data.message2,
          diagnostic: data.diagnostic,
        });
        loadInitialData();
      }
    } catch (err: any) {
      alert(`Erreur Agent Maps: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour le statut d'un prospect
  const handleStatusChange = async (id: string, newStatus: Prospect['status']) => {
    try {
      await fetch('/api/prospector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', id, status: newStatus }),
      });
      setProspects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Optimiser l'emploi du temps avec Pilote Automatique
  const handleOptimizeDay = async () => {
    setLoading(true);
    setDayPlan(null);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'optimize_day', day: dayToOptimize, schedule }),
      });
      const data = await res.json();
      setDayPlan(data.plan || data.error);
    } catch (err: any) {
      setDayPlan(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid space-y-6">
      {/* En-tête HUD */}
      <div className="border-b border-cyan-500/20 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
            <TrendingUp className="w-5 h-5" />
            <span>MOTEUR AUTONOME DE PROSPECTION // ROYSTEN SALES ENGINE</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Trio d'agents spécialisés (WhatsApp, Instagram, Google Maps) + Vos vrais tarifs & profil + Pilote automatique pendant vos cours et votre sommeil.
          </p>
        </div>

        {/* Badge statut */}
        <div className="flex items-center gap-2 bg-cyan-950/50 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-cyan-300 font-bold">PILOTE ACTIF</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">{prospects.length} prospects suivis</span>
        </div>
      </div>

      {/* Barre d'onglets de navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-cyan-500/20">
        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
            activeTab === 'agents'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-hud-cyan'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Trio d'Agents IA</span>
        </button>

        <button
          onClick={() => setActiveTab('crm')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
            activeTab === 'crm'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-hud-cyan'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pipeline & Prospects ({prospects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
            activeTab === 'profile'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-hud-cyan'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mon Profil & Tarifs Roysten</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
            activeTab === 'schedule'
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-hud-cyan'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          <span>Emploi du Temps École & Pilote</span>
        </button>

        <button
          onClick={() => setActiveTab('mobile')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
            activeTab === 'mobile'
              ? 'bg-indigo-500/25 border-indigo-400 text-indigo-300 shadow-hud-indigo'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>Connexion Téléphone Mobile</span>
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* ONGLET 1 : TRIO D'AGENTS IA                                        */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          {/* Sélecteur des 3 Agents */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => setSelectedAgent('whatsapp')}
              className={`p-3.5 rounded-lg border text-left transition-all relative ${
                selectedAgent === 'whatsapp'
                  ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-900/40 border-slate-800 hover:border-emerald-500/30'
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
                <MessageSquare className="w-4 h-4" />
                <span>Agent WhatsApp B2B & PME</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Approche WhatsApp directe en 2 temps, ultra-personnalisée, sans spam, avec lien Click-to-Chat.
              </p>
            </button>

            <button
              onClick={() => setSelectedAgent('instagram')}
              className={`p-3.5 rounded-lg border text-left transition-all relative ${
                selectedAgent === 'instagram'
                  ? 'bg-pink-950/40 border-pink-500/60 shadow-[0_0_15px_rgba(236,72,153,0.25)]'
                  : 'bg-slate-900/40 border-slate-800 hover:border-pink-500/30'
              }`}
            >
              <div className="flex items-center gap-2 text-pink-400 font-bold mb-1">
                <Instagram className="w-4 h-4" />
                <span>Agent Instagram DM Closer</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Accroche chirurgicale sur stories/posts pour créateurs, marques et e-commerçants.
              </p>
            </button>

            <button
              onClick={() => setSelectedAgent('maps')}
              className={`p-3.5 rounded-lg border text-left transition-all relative ${
                selectedAgent === 'maps'
                  ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-900/40 border-slate-800 hover:border-amber-500/30'
              }`}
            >
              <div className="flex items-center gap-2 text-amber-400 font-bold mb-1">
                <MapPin className="w-4 h-4" />
                <span>Agent Google Maps & Local</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Repère les restaurants, hôtels, cliniques sans site web ou menu digital à Cotonou/Afrique.
              </p>
            </button>
          </div>

          {/* Formulaire Agent WhatsApp */}
          {selectedAgent === 'whatsapp' && (
            <form onSubmit={handleRunWhatsApp} className="hud-panel p-5 rounded-lg border-emerald-500/30 space-y-4">
              <div className="text-xs text-emerald-400 font-bold flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>CONFIGURATION DE L'OUTREACH WHATSAPP</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Nom du contact / Gérant :</label>
                  <input
                    type="text"
                    required
                    value={waProspect.name}
                    onChange={(e) => setWaProspect({ ...waProspect, name: e.target.value })}
                    placeholder="ex: M. Sylvain Houessou"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Numéro WhatsApp (avec indicatif) :</label>
                  <input
                    type="text"
                    required
                    value={waProspect.phone}
                    onChange={(e) => setWaProspect({ ...waProspect, phone: e.target.value })}
                    placeholder="ex: +229 97 00 00 00"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Entreprise / Établissement :</label>
                  <input
                    type="text"
                    required
                    value={waProspect.businessName}
                    onChange={(e) => setWaProspect({ ...waProspect, businessName: e.target.value })}
                    placeholder="ex: Restaurant Le Palmier Doré"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Observation précise constatée sur leur business :</label>
                  <input
                    type="text"
                    value={waProspect.observation}
                    onChange={(e) => setWaProspect({ ...waProspect, observation: e.target.value })}
                    placeholder="ex: Aucun menu PDF interactif, commande par message direct chaotique"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Offre de Roysten à pitcher :</label>
                  <select
                    value={waProspect.offerId}
                    onChange={(e) => setWaProspect({ ...waProspect, offerId: e.target.value })}
                    className="w-full bg-[#090e1a] border border-slate-700 rounded p-2 text-xs text-slate-200 outline-none focus:border-emerald-400"
                  >
                    <option value="oresto-connect">Oresto Connect // Menu QR & Commande WhatsApp (250 000 - 500 000 FCFA)</option>
                    <option value="landing-page">Landing Page Haute Conversion (150 000 - 300 000 FCFA)</option>
                    <option value="ai-whatsapp-bot">Agent IA WhatsApp 24/7 (250 000 - 600 000 FCFA)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading || !waProspect.name}
                  className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-emerald-500/30 transition-all font-bold disabled:opacity-40"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{loading ? 'Rédaction de la séquence...' : 'Lancer l\'Agent WhatsApp'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Formulaire Agent Instagram */}
          {selectedAgent === 'instagram' && (
            <form onSubmit={handleRunInstagram} className="hud-panel p-5 rounded-lg border-pink-500/30 space-y-4">
              <div className="text-xs text-pink-400 font-bold flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                <span>CONFIGURATION DE L'OUTREACH INSTAGRAM DM</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Pseudo Instagram (@handle) :</label>
                  <input
                    type="text"
                    required
                    value={igProspect.handle}
                    onChange={(e) => setIgProspect({ ...igProspect, handle: e.target.value })}
                    placeholder="ex: @coach_karim ou @boutique_luxe"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-pink-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Niche du compte :</label>
                  <input
                    type="text"
                    value={igProspect.niche}
                    onChange={(e) => setIgProspect({ ...igProspect, niche: e.target.value })}
                    placeholder="ex: Mode & Prêt-à-porter, Coach fitness, Infopreneur"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-pink-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Élément spécifique remarqué sur son profil :</label>
                  <input
                    type="text"
                    value={igProspect.recentHook}
                    onChange={(e) => setIgProspect({ ...igProspect, recentHook: e.target.value })}
                    placeholder="ex: Pas de lien dans la bio, ou lien vers un WhatsApp non automatisé"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-pink-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Objectif du closing :</label>
                  <input
                    type="text"
                    value={igProspect.goal}
                    onChange={(e) => setIgProspect({ ...igProspect, goal: e.target.value })}
                    placeholder="ex: Vendre une landing page ou un chatbot WhatsApp"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-pink-400"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading || !igProspect.handle}
                  className="bg-pink-500/20 border border-pink-400 text-pink-300 px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-pink-500/30 transition-all font-bold disabled:opacity-40"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{loading ? 'Rédaction des DM...' : 'Lancer l\'Agent Instagram'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Formulaire Agent Google Maps */}
          {selectedAgent === 'maps' && (
            <form onSubmit={handleRunMaps} className="hud-panel p-5 rounded-lg border-amber-500/30 space-y-4">
              <div className="text-xs text-amber-400 font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>CONFIGURATION SNIPER GOOGLE MAPS // COMMERCE LOCAL</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Nom de l'établissement :</label>
                  <input
                    type="text"
                    required
                    value={mapsProspect.businessName}
                    onChange={(e) => setMapsProspect({ ...mapsProspect, businessName: e.target.value })}
                    placeholder="ex: Hôtel Résidence Marina"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Catégorie :</label>
                  <input
                    type="text"
                    value={mapsProspect.category}
                    onChange={(e) => setMapsProspect({ ...mapsProspect, category: e.target.value })}
                    placeholder="ex: Restaurant, Clinique, Salle de sport"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Ville :</label>
                  <input
                    type="text"
                    value={mapsProspect.city}
                    onChange={(e) => setMapsProspect({ ...mapsProspect, city: e.target.value })}
                    placeholder="ex: Cotonou, Abidjan, Dakar"
                    className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Manque constaté sur Google Maps / Web :</label>
                <input
                  type="text"
                  value={mapsProspect.missingItem}
                  onChange={(e) => setMapsProspect({ ...mapsProspect, missingItem: e.target.value })}
                  placeholder="ex: Pas de site web, menu illisible en photo floue, aucun bouton de réservation"
                  className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={loading || !mapsProspect.businessName}
                  className="bg-amber-500/20 border border-amber-400 text-amber-300 px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-amber-500/30 transition-all font-bold disabled:opacity-40"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{loading ? 'Analyse & Rédaction...' : 'Lancer le Diagnostic Maps'}</span>
                </button>
              </div>
            </form>
          )}

          {/* RÉSULTAT DE LA SÉQUENCE GÉNÉRÉE */}
          {generatedOutput && (
            <div className="hud-panel p-5 rounded-lg border-cyan-500/40 space-y-4 shadow-hud-cyan animate-fade-in">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>SÉQUENCE DE PROSPECTION GÉNÉRÉE (CONFORME AU PROFIL ROYSTEN)</span>
                </div>
                {generatedOutput.clickUrl && (
                  <a
                    href={generatedOutput.clickUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-3 py-1 rounded text-[11px] font-bold hover:bg-emerald-500/30"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ouvrir sur WhatsApp Web</span>
                  </a>
                )}
              </div>

              {generatedOutput.diagnostic && (
                <div className="bg-amber-950/30 border border-amber-500/40 rounded p-3 text-xs text-amber-200">
                  <span className="font-bold text-amber-400">Diagnostic de perte de CA : </span>
                  {generatedOutput.diagnostic}
                </div>
              )}

              {/* Message 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-cyan-400 font-bold">
                  <span>MESSAGE 1 : PREMIER CONTACT / ACCROCHE CHIRURGICALE</span>
                  <button
                    onClick={() => handleCopy(generatedOutput.message1, 'msg1')}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300"
                  >
                    {copiedKey === 'msg1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'msg1' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <div className="bg-[#090f20] border border-cyan-500/30 rounded p-3 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {generatedOutput.message1}
                </div>
              </div>

              {/* Message 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-indigo-400 font-bold">
                  <span>MESSAGE 2 : RELANCE AVEC DÉMO DE VALEUR & TARIFS ROYSTEN</span>
                  <button
                    onClick={() => handleCopy(generatedOutput.message2, 'msg2')}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300"
                  >
                    {copiedKey === 'msg2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'msg2' ? 'Copié !' : 'Copier'}</span>
                  </button>
                </div>
                <div className="bg-[#090f20] border border-indigo-500/30 rounded p-3 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {generatedOutput.message2}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ONGLET 2 : PIPELINE CRM & PROSPECTS SUIVIS                         */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'crm' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-cyan-400 font-bold text-xs glow-cyan">
              // PROSPECTS ENREGISTRÉS PAR LES AGENTS AUTONOMES
            </span>
            <button
              onClick={loadInitialData}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Actualiser</span>
            </button>
          </div>

          {prospects.length === 0 ? (
            <div className="hud-panel p-8 rounded-lg border-cyan-500/20 text-center space-y-2">
              <Users className="w-8 h-8 text-cyan-500/40 mx-auto" />
              <p className="text-slate-400">Aucun prospect enregistré pour le moment.</p>
              <p className="text-[11px] text-slate-500">
                Utilisez les agents WhatsApp, Instagram ou Google Maps pour générer et enregistrer automatiquement vos premiers prospects qualifiés.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {prospects.map((p) => (
                <div key={p.id} className="hud-panel p-4 rounded-lg border-slate-800 hover:border-cyan-500/40 space-y-3 transition-all">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.channel === 'whatsapp'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : p.channel === 'instagram'
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {p.channel.toUpperCase()}
                      </span>
                      <span className="font-bold text-slate-100 text-xs">{p.name}</span>
                      {p.businessName && <span className="text-slate-400 text-[11px]">({p.businessName})</span>}
                    </div>

                    {/* Statut sélecteur */}
                    <div className="flex items-center gap-1.5">
                      {(['nouveau', 'contacte_1', 'relance_2', 'converti', 'archive'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(p.id, st)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            p.status === st
                              ? st === 'converti'
                                ? 'bg-emerald-500 text-black font-extrabold'
                                : 'bg-cyan-500/30 text-cyan-300 border border-cyan-400'
                              : 'bg-slate-900 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="bg-[#090f20] border border-slate-800 rounded p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-cyan-400">
                        <span>Message 1 (Accroche)</span>
                        <button
                          onClick={() => handleCopy(p.message1, `c1-${p.id}`)}
                          className="hover:text-cyan-200"
                        >
                          {copiedKey === `c1-${p.id}` ? '✓ Copié' : 'Copier'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-3">{p.message1}</p>
                    </div>

                    <div className="bg-[#090f20] border border-slate-800 rounded p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-indigo-400">
                        <span>Message 2 (Relance / Tarifs)</span>
                        <button
                          onClick={() => handleCopy(p.message2, `c2-${p.id}`)}
                          className="hover:text-indigo-200"
                        >
                          {copiedKey === `c2-${p.id}` ? '✓ Copié' : 'Copier'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-3">{p.message2}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ONGLET 3 : PROFIL & GRILLE TARIFAIRE ROYSTEN                       */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'profile' && profile && (
        <div className="space-y-4">
          <div className="hud-panel p-5 rounded-lg border-cyan-500/30 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs glow-cyan">
              <Briefcase className="w-4 h-4" />
              <span>DONNÉES OFFICIELLES DU CRÉATEUR // ROYSTEN</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ces informations sont injectées dans chaque prompt de prospection pour que JARVIS ne rédige JAMAIS rien de générique et connaisse vos tarifs réels.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="bg-[#090f20] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500">Nom & Titre</span>
                <p className="font-bold text-slate-100">{profile.name}</p>
                <p className="text-[11px] text-cyan-400">{profile.title}</p>
              </div>
              <div className="bg-[#090f20] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500">Localisation & Contact</span>
                <p className="font-bold text-slate-100">{profile.location}</p>
                <p className="text-[11px] text-emerald-400">{profile.phone}</p>
              </div>
              <div className="bg-[#090f20] p-3 rounded border border-slate-800">
                <span className="text-[10px] text-slate-500">Projet Phare</span>
                <p className="font-bold text-slate-100">Oresto Connect</p>
                <p className="text-[11px] text-indigo-400">{profile.orestoUrl}</p>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-xs font-bold text-cyan-300 block mb-2">VOS OFFRES COMMERCIALES & TARIFS CONFIGURÉS :</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {profile.offers?.map((offer: RoystenOffer) => (
                  <div key={offer.id} className="bg-[#070b16] border border-cyan-500/30 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 text-xs">{offer.name}</span>
                    </div>
                    <div className="text-emerald-400 font-extrabold text-sm glow-emerald">
                      {offer.priceRange}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{offer.description}</p>
                    <div className="border-t border-slate-800 pt-2 text-[10px] text-slate-400 space-y-1">
                      <span className="font-bold text-cyan-400">Livrables inclus :</span>
                      {offer.deliverables.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ONGLET 4 : EMPLOI DU TEMPS ÉCOLE & PILOTE AUTOMATIQUE              */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          <div className="hud-panel p-5 rounded-lg border-cyan-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs glow-cyan">
                <Calendar className="w-4 h-4" />
                <span>EMPLOI DU TEMPS UNIVERSITAIRE & MODE PILOTE AUTOMATIQUE</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              JARVIS synchronise votre emploi du temps universitaire. Pendant que vous êtes en amphi ou que vous dormez, JARVIS fait tourner la prospection en arrière-plan.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <label className="text-xs text-slate-300 font-bold">Jour à organiser :</label>
              <select
                value={dayToOptimize}
                onChange={(e) => setDayToOptimize(e.target.value)}
                className="bg-[#090e1a] border border-cyan-500/40 rounded px-3 py-1.5 text-xs text-cyan-300 outline-none"
              >
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <button
                onClick={handleOptimizeDay}
                disabled={loading}
                className="bg-cyan-500/20 border border-cyan-400 text-cyan-300 px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 hover:bg-cyan-500/30 transition-all shadow-hud-cyan disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loading ? 'Calcul de l\'organisation...' : 'Optimiser ma journée avec JARVIS'}</span>
              </button>
            </div>

            {/* Liste des cours configurés */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 block mb-2">VOS COURS PROGRAMMÉS :</span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {schedule.map((c) => (
                  <div key={c.id} className="bg-[#090f20] border border-slate-800 rounded p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold">{c.day}</span>
                      <span className="text-[10px] text-slate-400">
                        {c.startTime} - {c.endTime}
                      </span>
                    </div>
                    <p className="text-slate-200 font-semibold">{c.subject}</p>
                    {c.location && <p className="text-[10px] text-slate-500">{c.location}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Plan généré */}
            {dayPlan && (
              <div className="mt-4 pt-4 border-t border-cyan-500/20 space-y-3">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs glow-cyan">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>PLANNING HEURE PAR HEURE OPTIMISÉ POUR {dayToOptimize.toUpperCase()}</span>
                </div>
                <div className="bg-[#070b16] border border-cyan-500/30 rounded-lg p-4 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                  {dayPlan}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* ONGLET 5 : CONNEXION TÉLÉPHONE MOBILE                              */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === 'mobile' && (
        <div className="space-y-4">
          <div className="hud-panel p-6 rounded-lg border-indigo-500/40 space-y-4 shadow-hud-indigo">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs glow-indigo">
              <Smartphone className="w-5 h-5" />
              <span>ACCÈS MOBILE DISTANT // TÉLÉPHONE SMARTPHONE</span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Même quand vous n'êtes pas devant votre PC (en cours d'amphi, dans les transports ou dans votre lit), vous pouvez piloter l'intégralité de JARVIS directement depuis votre téléphone portable.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
              <div className="bg-[#090f20] border border-indigo-500/30 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  <span>LIEN RÉSEAU LOCAL POUR VOTRE SMARTPHONE :</span>
                </span>

                <div className="bg-black/60 p-3 rounded-lg border border-indigo-500/40 font-mono text-sm text-indigo-300 break-all select-all flex items-center justify-between">
                  <span>http://{localIp}:3000</span>
                  <button
                    onClick={() => handleCopy(`http://${localIp}:3000`, 'ip')}
                    className="ml-2 text-xs bg-indigo-500/20 px-2 py-1 rounded text-indigo-300 hover:bg-indigo-500/30"
                  >
                    {copiedKey === 'ip' ? '✓ Copié' : 'Copier'}
                  </button>
                </div>

                <div className="space-y-2 text-[11px] text-slate-400 pt-1">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-400">1.</span>
                    <span>Connectez votre téléphone au **même réseau Wi-Fi** ou partage de connexion que ce PC.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-400">2.</span>
                    <span>Ouvrez Chrome ou Safari sur votre téléphone et tapez : <strong className="text-slate-200">http://{localIp}:3000</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-400">3.</span>
                    <span>Cliquez sur **« Ajouter à l'écran d'accueil »** pour installer JARVIS comme une application native sur votre téléphone !</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#090f20] border border-cyan-500/30 rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>FONCTIONNALITÉS DISPONIBLES SUR SMARTPHONE :</span>
                </span>

                <div className="space-y-2 text-[11px] text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Lancement des 3 agents de prospection en 1 clic</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Envoi direct des messages générés sur l'application WhatsApp de votre téléphone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Consultation de l'emploi du temps et des fiches d'exercices universitaires</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Suivi des prospects qualifiés et du statut des ventes en temps réel</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

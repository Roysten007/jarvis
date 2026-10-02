'use client';

import React, { useState } from 'react';
import { Share2, MessageSquare, Linkedin, Facebook, Send, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';

export function SocialMediaView() {
  const [platform, setPlatform] = useState<'whatsapp' | 'linkedin' | 'facebook'>('whatsapp');

  // WhatsApp State
  const [waPhone, setWaPhone] = useState('+229');
  const [waPrompt, setWaPrompt] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [waLoading, setWaLoading] = useState(false);

  // LinkedIn State
  const [liTopic, setLiTopic] = useState('');
  const [liType, setLiType] = useState('Tech Insight / Vibe Coding');
  const [liPost, setLiPost] = useState('');
  const [liLoading, setLiLoading] = useState(false);

  // General State
  const [copied, setCopied] = useState(false);

  // Générer message WhatsApp
  const handleGenerateWhatsApp = async () => {
    if (!waPrompt.trim()) return;
    setWaLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Rédige un message WhatsApp concis, percutant et courtois sur le sujet suivant : "${waPrompt}". N'ajoute pas de salutations de début ni de fin si ce n'est pas nécessaire, donne uniquement le texte du message prêt à être envoyé.`,
          stream: false,
        }),
      });
      const data = await res.json();
      setWaMessage(data.content || '');
    } catch (e) {
      console.error(e);
    } finally {
      setWaLoading(false);
    }
  };

  // Ouvrir WhatsApp Web / App
  const handleOpenWhatsApp = () => {
    const cleanPhone = waPhone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(waMessage);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Générer Post LinkedIn
  const handleGenerateLinkedIn = async () => {
    if (!liTopic.trim()) return;
    setLiLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `En tant que copywriter d'élite pour Roysten (étudiant brillant en maths/physique/informatique au Bénin, designer et vibe coder) :
Rédige un post LinkedIn engageant et professionnel sur le sujet : "${liTopic}".
Format : ${liType}.
Consignes :
1. Hook percutant en première ligne.
2. Structure aérée avec phrases courtes et puces.
3. Partage de valeur authentique sans condescendance.
4. Call to action stimulant pour les commentaires.
5. 3 à 5 hashtags pertinents (#tech #coding #benin #ai).`,
          stream: false,
        }),
      });
      const data = await res.json();
      setLiPost(data.content || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLiLoading(false);
    }
  };

  // Ouvrir LinkedIn
  const handleOpenLinkedIn = () => {
    navigator.clipboard.writeText(liPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.open('https://www.linkedin.com/feed/', '_blank');
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid space-y-6">
      <div className="border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
          <Share2 className="w-4 h-4" />
          <span>DIFFUSION & RÉSEAUX // WHATSAPP, LINKEDIN & SOCIAL</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Rédigez, optimisez et envoyez vos messages directement sur WhatsApp, LinkedIn ou vos réseaux en 1 clic.
        </p>
      </div>

      {/* Onglets des réseaux */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPlatform('whatsapp')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            platform === 'whatsapp'
              ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300 shadow-hud-emerald font-bold'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp Direct</span>
        </button>

        <button
          onClick={() => setPlatform('linkedin')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            platform === 'linkedin'
              ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-hud-cyan font-bold'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Linkedin className="w-4 h-4 text-cyan-400" />
          <span>LinkedIn Creator</span>
        </button>

        <button
          onClick={() => setPlatform('facebook')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
            platform === 'facebook'
              ? 'bg-indigo-500/20 border border-indigo-400 text-indigo-300 font-bold'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Facebook className="w-4 h-4 text-indigo-400" />
          <span>Facebook & X</span>
        </button>
      </div>

      {/* 1. WHATSAPP */}
      {platform === 'whatsapp' && (
        <div className="hud-panel p-5 rounded-lg border-emerald-500/30 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Numéro du destinataire (Bénin par défaut) :</label>
              <input
                type="text"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="+229 97 00 00 00"
                className="w-full bg-[#090e1a] border border-emerald-500/30 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Intention du message :</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={waPrompt}
                  onChange={(e) => setWaPrompt(e.target.value)}
                  placeholder="ex: Relance client pour templates Notion / Invitation réunion"
                  className="flex-1 bg-[#090e1a] border border-emerald-500/30 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={handleGenerateWhatsApp}
                  disabled={waLoading || !waPrompt.trim()}
                  className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-3 py-2 rounded flex items-center gap-1 hover:bg-emerald-500/30 disabled:opacity-40"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{waLoading ? '...' : 'Générer'}</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Message prêt pour WhatsApp :</label>
            <textarea
              rows={4}
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              placeholder="Le texte rédigé par Jarvis apparaîtra ici..."
              className="w-full bg-[#090e1a] border border-slate-700 rounded p-2.5 text-xs text-slate-100 outline-none focus:border-emerald-400 font-sans leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={!waMessage.trim()}
              onClick={() => copyText(waMessage)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded hover:border-emerald-400 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié' : 'Copier'}</span>
            </button>

            <button
              type="button"
              disabled={!waMessage.trim()}
              onClick={handleOpenWhatsApp}
              className="px-4 py-1.5 bg-emerald-500/25 border border-emerald-400 text-emerald-300 rounded hover:bg-emerald-500/35 flex items-center gap-2 font-bold shadow-hud-emerald disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ouvrir dans WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. LINKEDIN */}
      {platform === 'linkedin' && (
        <div className="hud-panel p-5 rounded-lg border-cyan-500/30 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Type de post :</label>
              <select
                value={liType}
                onChange={(e) => setLiType(e.target.value)}
                className="w-full bg-[#090e1a] border border-slate-700 rounded p-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
              >
                <option value="Tech Insight / Vibe Coding">Retour d'expérience Tech & Vibe Coding</option>
                <option value="Études & Résolution Maths/Physique">Découverte scientifique (Maths / Physique)</option>
                <option value="Lancement de Produit Digital">Annonce de nouveau produit digital</option>
                <option value="Storytelling Étudiant au Bénin">Storytelling personnel & résilience</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Sujet clé du post :</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={liTopic}
                  onChange={(e) => setLiTopic(e.target.value)}
                  placeholder="ex: Comment j'ai codé JARVIS avec NVIDIA NIM et Next.js"
                  className="flex-1 bg-[#090e1a] border border-cyan-500/30 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleGenerateLinkedIn}
                  disabled={liLoading || !liTopic.trim()}
                  className="bg-cyan-500/20 border border-cyan-400 text-cyan-300 px-3 py-2 rounded flex items-center gap-1 hover:bg-cyan-500/30 disabled:opacity-40 font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{liLoading ? '...' : 'Rédiger'}</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Post LinkedIn formaté :</label>
            <textarea
              rows={8}
              value={liPost}
              onChange={(e) => setLiPost(e.target.value)}
              placeholder="Le post LinkedIn généré apparaîtra ici..."
              className="w-full bg-[#090e1a] border border-slate-700 rounded p-2.5 text-xs text-slate-100 outline-none focus:border-cyan-400 font-sans leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={!liPost.trim()}
              onClick={() => copyText(liPost)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded hover:border-cyan-400 flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copié' : 'Copier'}</span>
            </button>

            <button
              type="button"
              disabled={!liPost.trim()}
              onClick={handleOpenLinkedIn}
              className="px-4 py-1.5 bg-cyan-500/25 border border-cyan-400 text-cyan-300 rounded hover:bg-cyan-500/35 flex items-center gap-2 font-bold shadow-hud-cyan disabled:opacity-40"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Copier & Ouvrir LinkedIn</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. FACEBOOK */}
      {platform === 'facebook' && (
        <div className="hud-panel p-5 rounded-lg border-indigo-500/30 space-y-4">
          <p className="text-xs text-slate-300 font-sans">
            Pour vos publications Facebook et X (Twitter), utilisez le même moteur de rédaction pour formater du contenu percutant adapté à votre audience béninoise et internationale.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPlatform('linkedin');
                setLiType('Storytelling Étudiant au Bénin');
              }}
              className="px-4 py-2 bg-indigo-500/20 border border-indigo-400 text-indigo-300 rounded hover:bg-indigo-500/30 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Générer un Storytelling percutant</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

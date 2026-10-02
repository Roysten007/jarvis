'use client';

import React, { useState } from 'react';
import { TrendingUp, Send, Sparkles, Copy, Check, Users } from 'lucide-react';

export function ProspectionView() {
  const [product, setProduct] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [channel, setChannel] = useState('Email');
  const [tone, setTone] = useState('Direct, percutant et axé sur les résultats');
  const [loading, setLoading] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.trim() || loading) return;

    setLoading(true);
    setGeneratedCopy(null);

    try {
      const res = await fetch('/api/modules/prospection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, targetAudience, channel, tone }),
      });
      const data = await res.json();
      setGeneratedCopy(data.copy || data.error);
    } catch (e: any) {
      setGeneratedCopy(`Erreur de génération : ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedCopy) return;
    navigator.clipboard.writeText(generatedCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid space-y-6">
      <div className="border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
          <TrendingUp className="w-4 h-4" />
          <span>MODULE PROSPECTION DIGITALE // CONVERSION RAPIDE</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Générez des messages de prospection ultra-ciblés pour créateurs et vendeurs de produits digitaux (e-books, templates, formations, SaaS).
        </p>
      </div>

      <form onSubmit={handleGenerate} className="hud-panel p-4 rounded-lg border-cyan-500/30 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Votre Produit ou Offre :</label>
            <input
              type="text"
              required
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="ex: Pack de templates Notion pour freelances africains"
              className="w-full bg-[#090e1a] border border-cyan-500/30 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Cible précise (Avatar) :</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="ex: Graphistes et développeurs indépendants au Bénin/Côte d'Ivoire"
              className="w-full bg-[#090e1a] border border-cyan-500/30 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Canal de diffusion :</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full bg-[#090e1a] border border-slate-700 rounded p-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
            >
              <option value="Email">Email professionnel</option>
              <option value="WhatsApp">Message WhatsApp direct</option>
              <option value="LinkedIn">Message privé LinkedIn</option>
              <option value="Instagram / X">Message privé Twitter / Instagram</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Ton de communication :</label>
            <input
              type="text"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="ex: Direct, cordial, chaleureux..."
              className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !product.trim()}
            className="bg-cyan-500/20 border border-cyan-400 text-cyan-300 px-5 py-2 rounded flex items-center gap-1.5 hover:bg-cyan-500/30 transition-all shadow-hud-cyan font-bold disabled:opacity-40"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Rédaction par JARVIS...' : 'Générer les pitchs'}</span>
          </button>
        </div>
      </form>

      {generatedCopy && (
        <div className="hud-panel p-5 rounded-lg border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
            <span className="text-cyan-400 font-bold text-xs glow-cyan">
              // SCRIPTS DE PROSPECTION ET RELANCES GÉNÉRÉS
            </span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
          <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans pt-2">
            {generatedCopy}
          </div>
        </div>
      )}
    </div>
  );
}

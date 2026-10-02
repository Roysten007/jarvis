'use client';

import React, { useState } from 'react';
import {
  Share2,
  MessageSquare,
  Linkedin,
  Facebook,
  Twitter,
  Instagram,
  Globe,
  Send,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Search,
  ArrowUpRight,
  Compass,
} from 'lucide-react';

export function SocialMediaView() {
  const [platform, setPlatform] = useState<'facebook' | 'twitter' | 'linkedin' | 'instagram' | 'whatsapp' | 'web'>('facebook');
  const [actionType, setActionType] = useState<'post' | 'comment'>('post');

  // Unified State
  const [topic, setTopic] = useState('');
  const [extraContext, setExtraContext] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // WhatsApp specific
  const [waPhone, setWaPhone] = useState('+229');

  // Web Navigator specific
  const [webQuery, setWebQuery] = useState('');

  // Suggestions rapides pour Roysten
  const presetTopics = [
    { label: '🚀 Lancement Assistant JARVIS', topic: 'Lancement de mon assistant JARVIS IA complet codé avec Next.js et NVIDIA NIM pour contrôler mon PC' },
    { label: '💻 Vibe Coding & Dev Moderne', topic: 'Pourquoi le Vibe Coding et l\'IA permettent d\'aller 10x plus vite en tant qu\'étudiant développeur' },
    { label: '📐 Maths, Physique & Code', topic: 'Le lien fascinant entre équations différentielles, algèbre linéaire et développement d\'algorithmes IA' },
    { label: '🇧🇯 Tech & Ambition Bénin', topic: 'Construire des projets technologiques d\'envergure internationale depuis Cotonou au Bénin' },
  ];

  // Génération de contenu via l'API IA
  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      let prompt = '';
      if (platform === 'twitter') {
        prompt = actionType === 'post'
          ? `Rédige un tweet viral percutant (< 260 caractères, hook puissant, 2 hashtags) sur : "${topic}". Donne uniquement le texte du tweet.`
          : `Rédige une réponse Twitter intelligente et courte (< 180 caractères) au sujet : "${topic}".`;
      } else if (platform === 'facebook') {
        prompt = actionType === 'post'
          ? `En tant que copywriter d'élite de Roysten (étudiant au Bénin, designer et vibe coder) : Rédige un post Facebook engageant, authentique et humain sur : "${topic}". Format aéré, émojis pertinents, question ouverte à la fin pour générer des commentaires. Donne uniquement le post.`
          : `Rédige un commentaire Facebook constructif, bienveillant et expert sous un post qui parle de : "${topic}".`;
      } else if (platform === 'linkedin') {
        prompt = actionType === 'post'
          ? `Rédige un post LinkedIn d'élite pour Roysten sur le sujet : "${topic}". Structure : hook percutant, apprentissages clés, sauts de ligne réguliers, call-to-action pour commentaires, 3 hashtags professionnels. Donne uniquement le texte.`
          : `Rédige un commentaire LinkedIn de haute valeur ajoutée réagissant à un post sur : "${topic}".`;
      } else if (platform === 'instagram') {
        prompt = `Rédige une légende Instagram captivante pour Roysten sur : "${topic}". Avec accroche, émojis, 12 hashtags tendance et une [Suggestion Visuelle / Reel]. Donne uniquement le texte complet.`;
      } else if (platform === 'whatsapp') {
        prompt = `Rédige un message WhatsApp concis, percutant et élégant sur le sujet : "${topic}". Donne uniquement le message prêt à envoyer.`;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, stream: false }),
      });
      const data = await res.json();
      setGeneratedText(data.content || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Copier le texte
  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Ouvrir et publier sur le réseau correspondant
  const handlePublish = () => {
    copyText(generatedText);

    if (platform === 'twitter') {
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedText)}`;
      window.open(url, '_blank');
    } else if (platform === 'facebook') {
      window.open('https://www.facebook.com', '_blank');
    } else if (platform === 'linkedin') {
      window.open('https://www.linkedin.com/feed/', '_blank');
    } else if (platform === 'instagram') {
      window.open('https://www.instagram.com', '_blank');
    } else if (platform === 'whatsapp') {
      const cleanPhone = waPhone.replace(/[^0-9]/g, '');
      const encoded = encodeURIComponent(generatedText);
      const url = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
      window.open(url, '_blank');
    }
  };

  // Navigation Web rapide
  const handleWebNavigate = (url: string) => {
    window.open(url, '_blank');
  };

  const handleWebSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webQuery.trim()) return;
    const url = webQuery.includes('.') && !webQuery.includes(' ')
      ? (webQuery.startsWith('http') ? webQuery : `https://${webQuery}`)
      : `https://www.google.com/search?q=${encodeURIComponent(webQuery)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid space-y-6">
      {/* En-tête HUD */}
      <div className="border-b border-cyan-500/20 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
            <Share2 className="w-4 h-4" />
            <span>STUDIO SOCIAL MEDIA & NAVIGATEUR WEB // ROYSTEN</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Générez des publications percutantes, commentez avec précision et naviguez sur le Web en 1 clic.
          </p>
        </div>
      </div>

      {/* Barre d'onglets des Plateformes */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setPlatform('facebook')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            platform === 'facebook'
              ? 'bg-blue-600/25 border border-blue-400 text-blue-300 shadow-hud-cyan font-bold'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Facebook className="w-4 h-4 text-blue-400" />
          <span>Facebook</span>
        </button>

        <button
          onClick={() => setPlatform('twitter')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            platform === 'twitter'
              ? 'bg-sky-500/25 border border-sky-400 text-sky-300 font-bold shadow-hud-cyan'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Twitter className="w-4 h-4 text-sky-400" />
          <span>X (Twitter)</span>
        </button>

        <button
          onClick={() => setPlatform('linkedin')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            platform === 'linkedin'
              ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-hud-cyan font-bold'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Linkedin className="w-4 h-4 text-cyan-400" />
          <span>LinkedIn</span>
        </button>

        <button
          onClick={() => setPlatform('instagram')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            platform === 'instagram'
              ? 'bg-rose-500/25 border border-rose-400 text-rose-300 font-bold shadow-hud-cyan'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Instagram className="w-4 h-4 text-rose-400" />
          <span>Instagram</span>
        </button>

        <button
          onClick={() => setPlatform('whatsapp')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            platform === 'whatsapp'
              ? 'bg-emerald-500/25 border border-emerald-400 text-emerald-300 shadow-hud-emerald font-bold'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp Direct</span>
        </button>

        <button
          onClick={() => setPlatform('web')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            platform === 'web'
              ? 'bg-amber-500/25 border border-amber-400 text-amber-300 shadow-hud-amber font-bold'
              : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4 text-amber-400" />
          <span>Navigateur Web</span>
        </button>
      </div>

      {/* VUE 1 : RÉSEAUX SOCIAUX (Facebook, Twitter, LinkedIn, Instagram, WhatsApp) */}
      {platform !== 'web' && (
        <div className="hud-panel p-5 rounded-lg border-cyan-500/30 space-y-4">
          {/* Bascule Action : Post vs Commentaire */}
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Type d'intervention :</span>
              <div className="flex bg-[#090e1a] p-1 rounded-lg border border-slate-700">
                <button
                  type="button"
                  onClick={() => setActionType('post')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    actionType === 'post'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📝 Créer une Publication (Post)
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('comment')}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    actionType === 'comment'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  💬 Rédiger un Commentaire
                </button>
              </div>
            </div>

            <span className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">
              {platform} // {actionType.toUpperCase()}
            </span>
          </div>

          {/* WhatsApp Spécifique : Numéro */}
          {platform === 'whatsapp' && (
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
          )}

          {/* Sujet du post ou du commentaire */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">
              {actionType === 'post' ? 'Sujet ou intention de la publication :' : 'Contenu ou contexte du post à commenter :'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  actionType === 'post'
                    ? 'ex: Pourquoi JARVIS va révolutionner mon travail de développeur / Vibe coding'
                    : 'ex: Bravo pour ce lancement ! Comment as-tu géré le déploiement sur Vercel ?'
                }
                className="flex-1 bg-[#090e1a] border border-cyan-500/30 rounded px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !topic.trim()}
                className="bg-cyan-500/20 border border-cyan-400 text-cyan-300 px-4 py-2 rounded flex items-center gap-1.5 hover:bg-cyan-500/30 disabled:opacity-40 font-bold shadow-hud-cyan transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{loading ? 'Rédaction...' : 'Rédiger avec IA'}</span>
              </button>
            </div>
          </div>

          {/* Suggestions de sujets rapides pour Roysten */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1.5">Sujets suggérés pour Roysten :</span>
            <div className="flex flex-wrap gap-1.5">
              {presetTopics.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(p.topic)}
                  className="px-2.5 py-1 rounded bg-[#090e1a] border border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-cyan-300 text-[11px] transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zone du Texte Généré */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-slate-400">Texte prêt pour {platform.toUpperCase()} :</label>
              {generatedText && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {generatedText.length} caractères
                </span>
              )}
            </div>
            <textarea
              rows={8}
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              placeholder="Le contenu rédigé apparaîtra ici. Vous pourrez l'ajuster ou le publier directement en un clic."
              className="w-full bg-[#090e1a] border border-slate-700 rounded p-3 text-xs text-slate-100 outline-none focus:border-cyan-400 font-sans leading-relaxed"
            />
          </div>

          {/* Actions : Copier et Publier */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400 italic">
              💡 Le clic sur "Publier" copie automatiquement le texte dans votre presse-papier Windows.
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!generatedText.trim()}
                onClick={() => copyText(generatedText)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded hover:border-cyan-400 flex items-center gap-1.5 disabled:opacity-40"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copié dans le presse-papier' : 'Copier'}</span>
              </button>

              <button
                type="button"
                disabled={!generatedText.trim()}
                onClick={handlePublish}
                className="px-4 py-1.5 bg-cyan-500/25 border border-cyan-400 text-cyan-300 rounded hover:bg-cyan-500/35 flex items-center gap-2 font-bold shadow-hud-cyan disabled:opacity-40 transition-all"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Ouvrir & Publier sur {platform.toUpperCase()}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VUE 2 : NAVIGATEUR WEB RAPIDE */}
      {platform === 'web' && (
        <div className="hud-panel p-5 rounded-lg border-amber-500/30 space-y-5">
          <div className="border-b border-amber-500/20 pb-3">
            <span className="text-amber-400 font-bold text-xs flex items-center gap-2 glow-amber">
              <Compass className="w-4 h-4" />
              <span>STATION DE NAVIGATION WEB // ACCÈS INSTANTANÉ</span>
            </span>
            <p className="text-[11px] text-slate-400 mt-1">
              Naviguez rapidement vers vos sites favoris ou effectuez une recherche sur le Web en direct.
            </p>
          </div>

          {/* Barre de recherche Web */}
          <form onSubmit={handleWebSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={webQuery}
                onChange={(e) => setWebQuery(e.target.value)}
                placeholder="Entrez une URL (ex: facebook.com) ou une recherche Google..."
                className="w-full bg-[#090e1a] border border-amber-500/30 rounded px-3 py-2 pl-9 text-xs text-slate-100 outline-none focus:border-amber-400"
              />
              <Search className="w-4 h-4 text-amber-400 absolute left-3 top-2.5" />
            </div>
            <button
              type="submit"
              className="bg-amber-500/20 border border-amber-400 text-amber-300 px-4 py-2 rounded flex items-center gap-1.5 font-bold hover:bg-amber-500/30 shadow-hud-amber"
            >
              <span>Naviguer</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Raccourcis Web Rapides */}
          <div>
            <label className="text-[10px] text-slate-400 block mb-2 font-bold tracking-wider">
              SITES & PLATEFORMES POPULAIRES :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { name: 'Facebook', url: 'https://www.facebook.com', color: 'border-blue-500/40 text-blue-300' },
                { name: 'X / Twitter', url: 'https://x.com', color: 'border-sky-500/40 text-sky-300' },
                { name: 'LinkedIn', url: 'https://www.linkedin.com', color: 'border-cyan-500/40 text-cyan-300' },
                { name: 'Instagram', url: 'https://www.instagram.com', color: 'border-rose-500/40 text-rose-300' },
                { name: 'YouTube', url: 'https://www.youtube.com', color: 'border-red-500/40 text-red-300' },
                { name: 'GitHub', url: 'https://github.com', color: 'border-slate-500/40 text-slate-300' },
                { name: 'Google', url: 'https://www.google.com', color: 'border-emerald-500/40 text-emerald-300' },
                { name: 'ChatGPT', url: 'https://chatgpt.com', color: 'border-teal-500/40 text-teal-300' },
              ].map((site, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleWebNavigate(site.url)}
                  className={`p-3 rounded-lg bg-[#090e1a] border ${site.color} hover:bg-cyan-500/10 flex items-center justify-between transition-all group`}
                >
                  <span className="font-bold text-xs">{site.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

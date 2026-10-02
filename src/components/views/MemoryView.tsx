'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Trash2, Plus, Sparkles, Filter, RefreshCw, Tag } from 'lucide-react';

interface MemoryItem {
  id: string;
  category: 'profile' | 'preference' | 'project' | 'person' | 'study' | 'custom';
  fact: string;
  importance: number;
  tags?: string[];
  created_at: string;
}

export function MemoryView() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFact, setNewFact] = useState('');
  const [newCategory, setNewCategory] = useState<'profile' | 'preference' | 'project' | 'person' | 'study' | 'custom'>('profile');
  const [newImportance, setNewImportance] = useState(4);
  const [newTags, setNewTags] = useState('');

  const loadMemories = async () => {
    setLoading(true);
    try {
      const url = selectedCategory === 'all' ? '/api/memory' : `/api/memory?category=${selectedCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [selectedCategory]);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer définitivement ce souvenir de la mémoire de Jarvis ?')) return;
    try {
      await fetch(`/api/memory?id=${id}`, { method: 'DELETE' });
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;

    try {
      const tagsArray = newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          fact: newFact.trim(),
          importance: newImportance,
          tags: tagsArray,
        }),
      });

      if (res.ok) {
        setNewFact('');
        setNewTags('');
        setShowAddForm(false);
        loadMemories();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const categories = [
    { id: 'all', label: 'Tous' },
    { id: 'profile', label: 'Profil' },
    { id: 'preference', label: 'Préférences' },
    { id: 'project', label: 'Projets' },
    { id: 'study', label: 'Études' },
    { id: 'person', label: 'Personnes' },
    { id: 'custom', label: 'Autres' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid space-y-6">
      {/* En-tête du module */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
            <Brain className="w-4 h-4" />
            <span>MÉMOIRE LONG TERME // COGNITION</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Chaque fait retenu par JARVIS est stocké ici de manière structurée et réinjecté intelligemment lors de vos conversations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 bg-cyan-500/20 border border-cyan-400 px-3 py-1.5 rounded text-cyan-300 hover:bg-cyan-500/30 transition-all shadow-hud-cyan text-[11px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Graver un souvenir</span>
          </button>
          <button
            onClick={loadMemories}
            className="p-1.5 bg-slate-900 border border-slate-700 rounded text-slate-400 hover:text-cyan-300"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Formulaire d'ajout de souvenir */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="hud-panel p-4 rounded-lg border-cyan-500/40 space-y-3">
          <div className="text-cyan-300 font-bold flex items-center gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nouveau Souvenir à Enregistrer</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Catégorie</label>
              <select
                value={newCategory}
                onChange={(e: any) => setNewCategory(e.target.value)}
                className="w-full bg-[#090e1a] border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400"
              >
                <option value="profile">Profil</option>
                <option value="preference">Préférence</option>
                <option value="project">Projet</option>
                <option value="study">Études</option>
                <option value="person">Personne</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Niveau d'importance (1 à 5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={newImportance}
                onChange={(e) => setNewImportance(Number(e.target.value))}
                className="w-full bg-[#090e1a] border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Tags (séparés par virgules)</label>
              <input
                type="text"
                placeholder="ex: bénin, maths, c++"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                className="w-full bg-[#090e1a] border border-slate-700 rounded p-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Fait à mémoriser</label>
            <textarea
              rows={2}
              required
              placeholder="ex: Roysten prépare un projet d'agent IA pour le marché béninois..."
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              className="w-full bg-[#090e1a] border border-slate-700 rounded p-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1 bg-slate-800 text-slate-400 rounded hover:text-slate-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-cyan-500/20 border border-cyan-400 text-cyan-300 rounded hover:bg-cyan-500/30"
            >
              Sauvegarder
            </button>
          </div>
        </form>
      )}

      {/* Filtres par catégorie */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] transition-all whitespace-nowrap ${
              selectedCategory === c.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Liste des souvenirs */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500 animate-pulse">
            Consultation des synapses de JARVIS...
          </div>
        ) : memories.length === 0 ? (
          <div className="hud-panel p-8 text-center text-slate-500 rounded-lg">
            Aucun souvenir répertorié dans cette catégorie.
          </div>
        ) : (
          memories.map((m) => (
            <div
              key={m.id}
              className="hud-panel p-3.5 rounded-lg border-cyan-500/20 hover:border-cyan-500/40 transition-all flex items-start justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {m.category}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Priorité : {'★'.repeat(m.importance)}{'☆'.repeat(5 - m.importance)}
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans">{m.fact}</p>

                {m.tags && m.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    <Tag className="w-2.5 h-2.5 text-slate-500" />
                    {m.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] text-slate-400 bg-slate-900/60 px-1.5 py-0.2 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDelete(m.id)}
                className="text-slate-500 hover:text-rose-400 p-1.5 transition-colors"
                title="Supprimer ce souvenir"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

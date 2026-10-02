'use client';

import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Clock, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
}

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleToggle = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          due_date: dueDate || undefined,
        }),
      });
      if (res.ok) {
        setTitle('');
        setDescription('');
        setShowAdd(false);
        loadTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-xs text-slate-200 hud-grid space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm tracking-wider glow-cyan">
            <CheckSquare className="w-4 h-4" />
            <span>MISSIONS & TÂCHES // LOGISTIQUE</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Gérez vos priorités universitaires, vos projets de code et vos échéances quotidiennes.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 bg-cyan-500/20 border border-cyan-400 px-3 py-1.5 rounded text-cyan-300 hover:bg-cyan-500/30 transition-all shadow-hud-cyan text-[11px]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouvelle Mission</span>
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="hud-panel p-4 rounded-lg border-cyan-500/30 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Titre de la tâche :</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Réviser l'électrostatique / Finir le script Next.js"
                className="w-full bg-[#090e1a] border border-cyan-500/30 rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Priorité :</label>
                <select
                  value={priority}
                  onChange={(e: any) => setPriority(e.target.value)}
                  className="w-full bg-[#090e1a] border border-slate-700 rounded p-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Échéance :</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#090e1a] border border-slate-700 rounded p-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Description (optionnelle) :</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Détails complémentaires..."
              className="w-full bg-[#090e1a] border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1 bg-slate-800 text-slate-400 rounded hover:text-slate-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-cyan-500/20 border border-cyan-400 text-cyan-300 rounded hover:bg-cyan-500/30"
            >
              Ajouter
            </button>
          </div>
        </form>
      )}

      {/* Liste des tâches */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="text-center py-10 text-slate-500 animate-pulse">
            Chargement des missions en cours...
          </div>
        ) : tasks.length === 0 ? (
          <div className="hud-panel p-8 text-center text-slate-500 rounded-lg">
            Aucune mission en cours. Vous êtes à jour, Monsieur Roysten.
          </div>
        ) : (
          tasks.map((task) => {
            const isDone = task.status === 'completed';
            return (
              <div
                key={task.id}
                onClick={() => handleToggle(task)}
                className={`hud-panel p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isDone
                    ? 'border-slate-800 opacity-60 bg-slate-950/40'
                    : 'border-cyan-500/20 hover:border-cyan-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      isDone
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-slate-600 bg-slate-900'
                    }`}
                  >
                    {isDone && <CheckCircle className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <span className={`text-xs ${isDone ? 'line-through text-slate-500' : 'text-slate-100 font-sans'}`}>
                      {task.title}
                    </span>
                    {task.description && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{task.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      task.priority === 'urgent'
                        ? 'bg-rose-950 border border-rose-500 text-rose-300'
                        : task.priority === 'high'
                        ? 'bg-amber-950 border border-amber-500 text-amber-300'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.due_date.slice(0, 10)}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

-- ==============================================================================
-- JARVIS ASSISTANT — SCHÉMA COMPLET SUPABASE POSTGRESQL
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor > New Query > Run)
-- ==============================================================================

-- 1. CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Nouvelle session',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour recherches rapides par utilisateur
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_email, updated_at DESC);

-- 2. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_results JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at ASC);

-- 3. MÉMOIRES LONG TERME
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('profile', 'preference', 'project', 'person', 'study', 'custom')),
    fact TEXT NOT NULL,
    importance INT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON public.memories(user_email, category);

-- 4. DOCUMENTS & BASE DE CONNAISSANCES
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents(user_email);

-- 5. TÂCHES & RAPPELS
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(user_email, due_date ASC);

-- 6. PROJETS
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('idea', 'active', 'paused', 'completed')),
    next_actions JSONB DEFAULT '[]'::jsonb,
    decisions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON public.projects(user_email);

-- 7. PROSPECTION (LEADS DIGITAUX)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT,
    product TEXT,
    contact_channel TEXT,
    status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'contacted', 'replied', 'closed', 'lost')),
    notes TEXT,
    last_interaction TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_user ON public.leads(user_email);

-- 8. PARAMÈTRES UTILISATEUR
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_email TEXT PRIMARY KEY,
    system_prompt TEXT,
    model_reasoning TEXT NOT NULL DEFAULT 'nvidia/nemotron-3-ultra-550b-a55b',
    model_fast TEXT NOT NULL DEFAULT 'meta/llama-3.2-11b-vision-instruct',
    voice_enabled BOOLEAN NOT NULL DEFAULT true,
    voice_speed REAL NOT NULL DEFAULT 1.0,
    voice_pitch REAL NOT NULL DEFAULT 1.0,
    voice_name TEXT DEFAULT '',
    theme TEXT NOT NULL DEFAULT 'hud-cyan',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activation de RLS (Row Level Security)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Politiques de sécurité (Plein accès pour service_role ou pour l'email autorisé)
CREATE POLICY "Full access for service role" ON public.conversations FOR ALL USING (true);
CREATE POLICY "Full access for service role on messages" ON public.messages FOR ALL USING (true);
CREATE POLICY "Full access for service role on memories" ON public.memories FOR ALL USING (true);
CREATE POLICY "Full access for service role on documents" ON public.documents FOR ALL USING (true);
CREATE POLICY "Full access for service role on tasks" ON public.tasks FOR ALL USING (true);
CREATE POLICY "Full access for service role on projects" ON public.projects FOR ALL USING (true);
CREATE POLICY "Full access for service role on leads" ON public.leads FOR ALL USING (true);
CREATE POLICY "Full access for service role on user_settings" ON public.user_settings FOR ALL USING (true);

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ugbinrddnhhbjnlhegcu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client Supabase avec droits administratifs pour les opérations serveur
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY || 'dummy_key',
  {
    auth: { persistSession: false },
  }
);

// Système de stockage local résilient en cas d'attente de migration Supabase
const DATA_DIR = path.join(process.cwd(), '.data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'jarvis-store.json');

interface LocalStore {
  conversations: any[];
  messages: any[];
  memories: any[];
  tasks: any[];
  projects: any[];
  leads: any[];
  settings: Record<string, any>;
}

function getLocalStore(): LocalStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_STORE_FILE)) {
      const initial: LocalStore = {
        conversations: [],
        messages: [],
        memories: [
          {
            id: 'mem-1',
            user_email: process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com',
            category: 'profile',
            fact: 'Roysten est étudiant en maths/physique/informatique au Bénin, designer et vibe coder.',
            importance: 5,
            tags: ['etudes', 'benin', 'design', 'code'],
            created_at: new Date().toISOString(),
          },
          {
            id: 'mem-2',
            user_email: process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com',
            category: 'preference',
            fact: 'Préfère des réponses directes, concises et en français avec un ton d\'assistant d\'élite.',
            importance: 5,
            tags: ['ton', 'francais', 'style'],
            created_at: new Date().toISOString(),
          }
        ],
        tasks: [],
        projects: [],
        leads: [],
        settings: {},
      };
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const content = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return {
      conversations: [],
      messages: [],
      memories: [],
      tasks: [],
      projects: [],
      leads: [],
      settings: {},
    };
  }
}

function saveLocalStore(store: LocalStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.error('[DB] Erreur sauvegarde locale:', e);
  }
}

// -----------------------------------------------------------------------------
// CONVERSATIONS & MESSAGES
// -----------------------------------------------------------------------------
export async function getConversations(userEmail: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('user_email', userEmail)
      .order('updated_at', { ascending: false });

    if (!error && data) return data;
  } catch (e) {
    // Fallback local
  }
  const store = getLocalStore();
  return store.conversations.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

export async function createConversation(userEmail: string, title: string = 'Nouvelle session') {
  const newConv = {
    id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    user_email: userEmail,
    title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert(newConv)
      .select()
      .single();

    if (!error && data) return data;
  } catch (e) {
    // Fallback
  }

  const store = getLocalStore();
  store.conversations.unshift(newConv);
  saveLocalStore(store);
  return newConv;
}

export async function getMessages(conversationId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) return data;
  } catch (e) {
    // Fallback
  }

  const store = getLocalStore();
  return store.messages
    .filter((m) => m.conversation_id === conversationId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function saveMessage(msg: {
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: any;
  tool_results?: any;
}) {
  const newMsg = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    ...msg,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabaseAdmin.from('messages').insert(newMsg).select().single();
    if (!error && data) {
      await supabaseAdmin
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', msg.conversation_id);
      return data;
    }
  } catch (e) {
    // Fallback
  }

  const store = getLocalStore();
  store.messages.push(newMsg);
  const conv = store.conversations.find((c) => c.id === msg.conversation_id);
  if (conv) conv.updated_at = new Date().toISOString();
  saveLocalStore(store);
  return newMsg;
}

// -----------------------------------------------------------------------------
// SOUVENIRS / MÉMOIRES
// -----------------------------------------------------------------------------
export async function getMemories(userEmail: string, category?: string) {
  try {
    let query = supabaseAdmin.from('memories').select('*').eq('user_email', userEmail);
    if (category) query = query.eq('category', category);
    const { data, error } = await query.order('importance', { ascending: false });

    if (!error && data) return data;
  } catch (e) {
    // Fallback
  }

  const store = getLocalStore();
  let list = store.memories;
  if (category) list = list.filter((m) => m.category === category);
  return list.sort((a, b) => b.importance - a.importance);
}

export async function saveMemory(memory: {
  user_email: string;
  category: 'profile' | 'preference' | 'project' | 'person' | 'study' | 'custom';
  fact: string;
  importance?: number;
  tags?: string[];
}) {
  const item = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    user_email: memory.user_email,
    category: memory.category,
    fact: memory.fact,
    importance: memory.importance || 3,
    tags: memory.tags || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabaseAdmin.from('memories').insert(item).select().single();
    if (!error && data) return data;
  } catch (e) {
    // Fallback
  }

  const store = getLocalStore();
  store.memories.unshift(item);
  saveLocalStore(store);
  return item;
}

export async function deleteMemory(id: string) {
  try {
    await supabaseAdmin.from('memories').delete().eq('id', id);
  } catch (e) {
    // Fallback
  }
  const store = getLocalStore();
  store.memories = store.memories.filter((m) => m.id !== id);
  saveLocalStore(store);
  return { success: true };
}

// -----------------------------------------------------------------------------
// TÂCHES & RAPPELS
// -----------------------------------------------------------------------------
export async function getTasks(userEmail: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_email', userEmail)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (!error && data) return data;
  } catch (e) {
    // Fallback
  }
  const store = getLocalStore();
  return store.tasks;
}

export async function saveTask(task: {
  user_email: string;
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'todo' | 'in_progress' | 'completed' | 'cancelled';
}) {
  const item = {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    ...task,
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabaseAdmin.from('tasks').insert(item).select().single();
    if (!error && data) return data;
  } catch (e) {
    // Fallback
  }

  const store = getLocalStore();
  store.tasks.unshift(item);
  saveLocalStore(store);
  return item;
}

export async function updateTaskStatus(id: string, status: string) {
  try {
    await supabaseAdmin.from('tasks').update({ status }).eq('id', id);
  } catch (e) {
    // Fallback
  }
  const store = getLocalStore();
  const task = store.tasks.find((t) => t.id === id);
  if (task) task.status = status;
  saveLocalStore(store);
  return { success: true };
}

export interface Contact {
  name: string;
  phone: string;
  created_at?: string;
}

export async function getContacts(): Promise<Contact[]> {
  const store = getLocalStore();
  const list: Contact[] = (store as any).contacts || [];
  if (!list.some((c) => c.name.toLowerCase() === 'roysten')) {
    list.push({ name: 'Roysten', phone: '22997123456' });
  }
  return list;
}

export async function saveContact(name: string, phone: string): Promise<Contact> {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const cleanName = name.trim();
  const store = getLocalStore();
  if (!(store as any).contacts) (store as any).contacts = [];
  const existing = (store as any).contacts.find(
    (c: any) => c.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (existing) {
    existing.phone = cleanPhone;
    saveLocalStore(store);
    return existing;
  }
  const item: Contact = { name: cleanName, phone: cleanPhone, created_at: new Date().toISOString() };
  (store as any).contacts.push(item);
  saveLocalStore(store);
  return item;
}

export async function resolveContactPhone(
  nameOrPhone: string
): Promise<{ name: string; phone: string } | null> {
  const clean = nameOrPhone.trim();
  const directDigits = clean.replace(/[^0-9]/g, '');
  if (directDigits.length >= 8) {
    return { name: clean, phone: directDigits };
  }
  const lower = clean.toLowerCase();
  if (lower === 'roysten' || lower === 'moi' || lower === 'seweto' || lower === 'michel') {
    return { name: 'Roysten', phone: '22997123456' };
  }
  const contacts = await getContacts();
  const found = contacts.find(
    (c) => c.name.toLowerCase() === lower || lower.includes(c.name.toLowerCase())
  );
  if (found) return found;
  return null;
}


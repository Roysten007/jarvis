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

import { getDataDirectory } from './storage-path';

// Système de stockage local résilient en cas d'attente de migration Supabase
function getStoreFilePath(): string {
  return path.join(getDataDirectory(), 'jarvis-store.json');
}

interface LocalStore {
  conversations: any[];
  messages: any[];
  memories: any[];
  tasks: any[];
  projects: any[];
  leads: any[];
  settings: Record<string, any>;
}

let memoryStoreCache: LocalStore | null = null;

function getLocalStore(): LocalStore {
  if (memoryStoreCache) {
    return memoryStoreCache;
  }

  const filePath = getStoreFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      memoryStoreCache = JSON.parse(content);
      return memoryStoreCache!;
    }
  } catch (e) {
    // Continuer vers l'initialisation
  }

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
        fact: "Préfère des réponses directes, concises et en français avec un ton d'assistant d'élite.",
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

  memoryStoreCache = initial;
  try {
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), 'utf8');
  } catch (e) {
    // Pas grave si écriture restreinte, memoryStoreCache est en place
  }

  return initial;
}

function saveLocalStore(store: LocalStore) {
  memoryStoreCache = store;
  try {
    const filePath = getStoreFilePath();
    fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    // Ignorer si écriture temporairement restreinte
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
  const contactsMap = new Map<string, Contact>();

  // 1. Contacts système par défaut
  contactsMap.set('roysten', { name: 'Roysten', phone: '22946305190' });
  contactsMap.set('precieux', { name: 'Précieux', phone: '22947988892' });

  // 2. Récupération depuis Supabase (Cloud & Multi-device)
  try {
    const { data, error } = await supabaseAdmin
      .from('memories')
      .select('*')
      .eq('category', 'person');

    if (!error && data) {
      for (const m of data) {
        if (Array.isArray(m.tags) && m.tags.includes('contact')) {
          try {
            const parsed = typeof m.fact === 'string' ? JSON.parse(m.fact) : m.fact;
            if (parsed && parsed.name && parsed.phone) {
              const norm = parsed.name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();
              contactsMap.set(norm, {
                name: parsed.name,
                phone: parsed.phone,
                created_at: m.created_at,
              });
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    // Fallback silencieux vers le store local
  }

  // 3. Récupération depuis le store local
  const store = getLocalStore();
  const localList: Contact[] = (store as any).contacts || [];
  for (const c of localList) {
    const norm = c.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (!contactsMap.has(norm)) {
      contactsMap.set(norm, c);
    }
  }

  return Array.from(contactsMap.values());
}

export async function saveContact(name: string, phone: string): Promise<Contact> {
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 8) cleanPhone = '229' + cleanPhone;
  else if (cleanPhone.length === 10 && cleanPhone.startsWith('01')) cleanPhone = '229' + cleanPhone;

  const cleanName = name.trim();
  const normName = cleanName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const item: Contact = { name: cleanName, phone: cleanPhone, created_at: new Date().toISOString() };

  // 1. Sauvegarde dans Supabase pour synchronisation immédiate sur Vercel et Mobile
  try {
    const { randomUUID } = await import('crypto');
    const userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com';

    // Vérifier si un contact avec ce tag existe déjà
    const { data: existing } = await supabaseAdmin
      .from('memories')
      .select('*')
      .eq('category', 'person')
      .contains('tags', ['contact', normName]);

    if (existing && existing.length > 0) {
      await supabaseAdmin
        .from('memories')
        .update({
          fact: JSON.stringify({ name: cleanName, phone: cleanPhone }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);
    } else {
      await supabaseAdmin.from('memories').insert({
        id: randomUUID(),
        user_email: userEmail,
        category: 'person',
        fact: JSON.stringify({ name: cleanName, phone: cleanPhone }),
        importance: 5,
        tags: ['contact', normName],
        created_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    // Si Supabase indisponible, continuer sur le store local
  }

  // 2. Sauvegarde dans le store local
  const store = getLocalStore();
  if (!(store as any).contacts) (store as any).contacts = [];
  const existingLocal = (store as any).contacts.find(
    (c: any) =>
      c.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase() === normName
  );
  if (existingLocal) {
    existingLocal.phone = cleanPhone;
    saveLocalStore(store);
    return existingLocal;
  }
  (store as any).contacts.push(item);
  saveLocalStore(store);
  return item;
}

export async function resolveContactPhone(
  nameOrPhone: string
): Promise<{ name: string; phone: string } | null> {
  const clean = nameOrPhone.trim();
  let directDigits = clean.replace(/[^0-9]/g, '');
  if (directDigits.length === 8) directDigits = '229' + directDigits;
  else if (directDigits.length === 10 && directDigits.startsWith('01')) directDigits = '229' + directDigits;

  if (directDigits.length >= 8) {
    return { name: clean, phone: directDigits };
  }

  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const normInput = normalize(clean);
  if (normInput === 'roysten' || normInput === 'moi' || normInput === 'seweto' || normInput === 'michel') {
    return { name: 'Roysten', phone: '22946305190' };
  }
  if (normInput === 'precieux') {
    return { name: 'Précieux', phone: '22947988892' };
  }

  const contacts = await getContacts();
  const found = contacts.find((c) => {
    const normC = normalize(c.name);
    return normC === normInput || normC.includes(normInput) || normInput.includes(normC);
  });
  if (found) return found;
  return null;
}


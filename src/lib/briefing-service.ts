import { getTasks } from '@/lib/db';
import { callNvidiaChat } from '@/lib/nvidia';
import { JARVIS_CONFIG } from '@/lib/config';

export async function generateMorningBriefing(userEmail: string): Promise<string> {
  const tasks = await getTasks(userEmail);

  const now = new Date();
  const beninTime = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Porto-Novo',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(now);

  const pendingTasks = tasks.filter((t: any) => t.status !== 'completed').slice(0, 5);

  const prompt = `Génère le point de situation exécutif pour Monsieur Roysten.
Informations actuelles :
- Date et Heure au Bénin : ${beninTime}
- Tâches prioritaires en cours (${pendingTasks.length}) :
${pendingTasks.map((t: any) => `  * ${t.title} (Priorité: ${t.priority || 'moyenne'})`).join('\n') || '  * Aucune tâche urgente en attente.'}

Consignes :
1. Adopte le ton loyal, distingué et concis de JARVIS.
2. Salue Monsieur Roysten.
3. Fais le point sur sa journée, ses priorités en maths/physique/code, et confirme que tous les sous-systèmes sont opérationnels.
4. Reste percutant, structuré et inspirant.`;

  const { content } = await callNvidiaChat(
    [
      { role: 'system', content: JARVIS_CONFIG.defaultSystemPrompt },
      { role: 'user', content: prompt },
    ],
    {
      model: JARVIS_CONFIG.defaultFastModel,
      temperature: 0.4,
    }
  );

  return content;
}

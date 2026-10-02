import { NextResponse } from 'next/server';
import { getTasks } from '@/lib/db';
import { callNvidiaChat } from '@/lib/nvidia';
import { JARVIS_CONFIG } from '@/lib/config';

export async function GET() {
  try {
    const userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com';
    const tasks = await getTasks(userEmail);

    const now = new Date();
    const beninTime = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Porto-Novo',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(now);

    const pendingTasks = tasks.filter((t: any) => t.status !== 'completed').slice(0, 5);

    const prompt = `Génère le "Morning Briefing" (résumé exécutif matinal) pour Monsieur Roysten.
Informations actuelles :
- Date et Heure au Bénin : ${beninTime}
- Tâches prioritaires en cours (${pendingTasks.length}) :
${pendingTasks.map((t: any) => `  * ${t.title} (Priorité: ${t.priority || 'moyenne'})`).join('\n') || '  * Aucune tâche urgente signalée.'}

Consignes :
1. Adopte le ton loyal, distingué et concis de JARVIS.
2. Salue Monsieur Roysten.
3. Fais le point sur sa journée, ses priorités en maths/physique/code, et rappelle-lui que le système est paré.
4. Reste en dessous de 120 mots. Sois percutant et inspirant.`;

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

    return NextResponse.json({
      timestamp: beninTime,
      briefing: content,
      tasksCount: pendingTasks.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

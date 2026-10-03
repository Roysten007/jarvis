import { NextRequest, NextResponse } from 'next/server';
import { getRoystenProfile, saveRoystenProfile, CourseSlot } from '@/lib/roysten-profile';
import { createNvidiaChatCompletion } from '@/lib/nvidia';

export async function GET() {
  try {
    const profile = getRoystenProfile();
    return NextResponse.json({
      schedule: profile.schedule,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, schedule, day = 'Lundi' } = body;

    // 1. Sauvegarder l'emploi du temps
    if (action === 'save_schedule' && Array.isArray(schedule)) {
      const updated = saveRoystenProfile({ schedule });
      return NextResponse.json({ success: true, schedule: updated.schedule });
    }

    // 2. Générer l'optimisation intelligente de la journée
    if (action === 'optimize_day') {
      const profile = getRoystenProfile();
      const currentSchedule = schedule || profile.schedule;
      const dayCourses = currentSchedule.filter((c: CourseSlot) => c.day.toLowerCase() === day.toLowerCase());

      const coursesText = dayCourses.length > 0
        ? dayCourses.map((c: CourseSlot) => `- ${c.startTime} à ${c.endTime} : ${c.subject} (${c.location || 'Faculté'})`).join('\n')
        : 'Aucun cours programmé ce jour (Journée libre de cours).';

      const prompt = `
Tu es JARVIS, l'assistant d'élite de Roysten (étudiant en sciences/informatique, développeur freelance et bâtisseur de SaaS).
Voici les cours obligatoires de Roysten pour la journée de **${day}** :
${coursesText}

OBJECTIF : Organise la journée complète de Roysten (de 06:30 à 23:30) pour maximiser sa réussite académique et son chiffre d'affaires, en intégrant le mode PILOTE AUTOMATIQUE pendant ses cours et son sommeil.

Génère un emploi du temps heure par heure équilibré, structuré avec les catégories suivantes :
1. 🎓 **COURS & ACADÉMIQUE** : Présence en cours, concentration totale.
2. 🤖 **PILOTE AUTOMATIQUE JARVIS** (Pendant ses cours ou la nuit) : Ce que JARVIS fait en tâche de fond (recherche de prospects sur Google Maps, préparation des messages WhatsApp, audits de sites).
3. 💻 **DEEP WORK ROYSTEN** (En dehors des cours) : Développement web, finalisation des commandes clients, envoi des démos personnalisées.
4. 🧠 **RÉVISIONS & ÉTUDES** : 1h30 de révision active ciblée sur les matières du jour.
5. ⚡ **REPOS & SPORT / PAUSE** : Récupération optimale.

Format attendu : Tableau synthétique clair en Markdown heure par heure + 3 conseils tactiques de JARVIS pour la journée.
`;

      const { JARVIS_CONFIG } = await import('@/lib/config');
      const aiRes = await createNvidiaChatCompletion([
        { role: 'system', content: 'Tu es un planificateur stratégique et majordome IA de haut niveau.' },
        { role: 'user', content: prompt },
      ], { temperature: 0.3, model: JARVIS_CONFIG.defaultFastModel });

      return NextResponse.json({
        day,
        courses: dayCourses,
        plan: aiRes.content,
      });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (e: any) {
    console.error('[SCHEDULE_API_ERROR]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

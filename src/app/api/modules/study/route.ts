import { NextRequest, NextResponse } from 'next/server';
import { callNvidiaChat } from '@/lib/nvidia';
import { JARVIS_CONFIG } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const { topic, mode, level = 'Universitaire / Math-Physique' } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: 'Sujet requis' }, { status: 400 });
    }

    let prompt = '';
    if (mode === 'exercise') {
      prompt = `En tant que JARVIS, professeur d'élite pour Roysten (étudiant en maths/physique/informatique au Bénin), conçois une fiche d'exercices d'excellence sur le sujet : "${topic}".
Niveau : ${level}.
Structure attendue :
1. Rappel synthétique des 3 formules/théorèmes fondamentaux avec notations mathématiques claires.
2. Exercice 1 (Application directe / Échauffement) avec solution détaillée pas à pas.
3. Exercice 2 (Problème d'approfondissement / Électrostatique, Énergie ou Algèbre linéaire selon le sujet) avec indications et correction rigoureuse.
4. Conseil méthodologique de majordome futuriste pour maîtriser ce concept aux examens.`;
    } else if (mode === 'quiz') {
      prompt = `En tant que JARVIS, génère un quiz d'auto-évaluation rapide de 3 questions à choix multiples stimulantes sur : "${topic}".
Pour chaque question, fournis 4 options (A, B, C, D), indique la bonne réponse et explique physiquement ou mathématiquement pourquoi en 2 phrases.`;
    } else {
      prompt = `En tant que JARVIS, majordome IA et tuteur scientifique d'élite de Roysten, explique avec rigueur, élégance et intuition physique/mathématique le concept suivant : "${topic}".
Niveau : ${level}.
Explique :
- La genèse et l'intuition concrète du phénomène/théorème.
- La formulation mathématique exacte.
- Les applications concrètes (énergie, électricité, algorithmique ou modélisation).
- Les pièges classiques à éviter.`;
    }

    const { content } = await callNvidiaChat(
      [
        { role: 'system', content: JARVIS_CONFIG.defaultSystemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        model: JARVIS_CONFIG.defaultReasoningModel,
        temperature: 0.3,
      }
    );

    return NextResponse.json({ result: content, topic, mode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { callNvidiaChat } from '@/lib/nvidia';
import { JARVIS_CONFIG } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const { targetAudience, product, tone = 'direct et percutant', channel = 'email' } = await req.json();

    if (!product) {
      return NextResponse.json({ error: 'Description du produit requise' }, { status: 400 });
    }

    const prompt = `En tant que JARVIS, expert en copywriting à haute conversion pour Roysten (vendeurs de produits digitaux / SaaS / services tech) :
Rédige 2 propositions distinctes de message de prospection ultra-personnalisé pour :
- Produit/Offre : "${product}"
- Cible : "${targetAudience || 'Créateurs et vendeurs de produits digitaux'}"
- Canal : ${channel} (Email, WhatsApp, LinkedIn ou DM)
- Ton : ${tone}

Directives de copywriting :
1. Hook percutant axé sur la douleur concrète de la cible (pas de blabla générique).
2. Présentation de la transformation sans survendre.
3. Call to Action (CTA) à très faible friction (ex: "Intéressé pour que je t'envoie une démo de 2 min ?").
4. Proposition de relance (Follow-up) à envoyer à J+3 si pas de réponse.`;

    const { content } = await callNvidiaChat(
      [
        { role: 'system', content: JARVIS_CONFIG.defaultSystemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        model: JARVIS_CONFIG.defaultReasoningModel,
        temperature: 0.4,
      }
    );

    return NextResponse.json({ copy: content });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

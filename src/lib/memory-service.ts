import { getMemories, saveMemory } from './db';
import { callNvidiaChat } from './nvidia';
import { JARVIS_CONFIG } from './config';

export async function getRelevantMemories(userEmail: string, userPrompt: string): Promise<string> {
  const allMemories = await getMemories(userEmail);
  if (!allMemories || allMemories.length === 0) return '';

  const promptWords = userPrompt.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  // Calcul du score de pertinence
  const scored = allMemories.map((mem) => {
    let score = mem.importance || 3;
    const factLower = mem.fact.toLowerCase();
    const tags = Array.isArray(mem.tags) ? mem.tags : [];

    promptWords.forEach((word) => {
      if (factLower.includes(word)) score += 3;
      if (tags.some((t: string) => t.toLowerCase().includes(word))) score += 4;
    });

    return { mem, score };
  });

  // Conserver les plus pertinents (max 5)
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => `- [${item.mem.category.toUpperCase()}] ${item.mem.fact}`);

  if (top.length === 0) return '';
  return `\n### SOUVENIRS ET INFORMATIONS PERTINENTES CONCERNANT ROYSTEN :\n${top.join('\n')}\n`;
}

// Extraction automatique des faits durables après une conversation
export async function extractAndSaveMemories(userEmail: string, userMessage: string, assistantReply: string) {
  try {
    const extractionPrompt = `Tu es un module d'extraction de mémoire à long terme pour JARVIS.
Analyse cet échange entre Roysten et JARVIS.
Y a-t-il une information durable nouvelle, une préférence, un projet, une personne, ou une décision importante à mémoriser sur Roysten ?

Message de Roysten : "${userMessage}"
Réponse de JARVIS : "${assistantReply.slice(0, 500)}"

Si OUI, réponds STRICTEMENT avec un objet JSON au format :
{
  "hasFact": true,
  "category": "profile" | "preference" | "project" | "person" | "study" | "custom",
  "fact": "La phrase précise et factuelle en français",
  "importance": 1 à 5,
  "tags": ["mot1", "mot2"]
}

Si NON (simple question générale, salutation courante, calcul mathématique ponctuel), réponds STRICTEMENT :
{
  "hasFact": false
}`;

    const { content } = await callNvidiaChat(
      [
        { role: 'system', content: 'Tu es un parseur JSON strict. Ne réponds que par le JSON valide.' },
        { role: 'user', content: extractionPrompt },
      ],
      {
        model: JARVIS_CONFIG.defaultFastModel,
        temperature: 0.1,
        max_tokens: 200,
      }
    );

    // Extraction du JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.hasFact && parsed.fact && parsed.category) {
      console.log(`[MÉMOIRE] Nouveau souvenir mémorisé : [${parsed.category}] ${parsed.fact}`);
      return await saveMemory({
        user_email: userEmail,
        category: parsed.category,
        fact: parsed.fact,
        importance: parsed.importance || 3,
        tags: parsed.tags || [],
      });
    }
  } catch (err: any) {
    console.warn('[MÉMOIRE] Erreur lors de l\'extraction automatique:', err.message);
  }
  return null;
}

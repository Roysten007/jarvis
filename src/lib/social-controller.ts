import { callNvidiaChat, ChatMessage } from './nvidia';
import { copyToClipboard } from './system-controller';

export type SocialPlatform = 'facebook' | 'twitter' | 'linkedin' | 'instagram';
export type SocialActionType = 'post' | 'comment';

export interface SocialResult {
  content: string;
  platform: SocialPlatform;
  actionType: SocialActionType;
  actionUrl: string;
  clipboardCopied: boolean;
}

/**
 * Moteur de rédaction et d'automatisation des réseaux sociaux pour Roysten
 */
export async function generateSocialContent(
  platform: SocialPlatform,
  actionType: SocialActionType,
  topic: string,
  extraContext?: string
): Promise<SocialResult> {
  const cleanTopic = topic.trim();

  let systemPrompt = '';
  let userPrompt = '';
  let actionUrl = '';

  if (platform === 'twitter') {
    if (actionType === 'post') {
      systemPrompt = `Tu es le copywriter d'élite de Roysten (étudiant brillant au Bénin, designer et vibe coder).
Rédige un tweet viral et percutant en français.
Contraintes strictes :
- Maximum 260 caractères (pour tenir dans la limite de 280 caractères de Twitter/X).
- Une première ligne captivante (hook).
- Un corps concis avec du punch.
- 1 à 3 hashtags ciblés (#AI #Tech #Coding #BuildInPublic).
- Pas de blabla d'introduction, donne UNIQUEMENT le texte du tweet à publier.`;
      userPrompt = `Rédige un tweet captivant sur : "${cleanTopic}".`;
    } else {
      systemPrompt = `Tu es Roysten sur Twitter/X. Rédige une réponse/commentaire courte, intelligente et engageante à un tweet.
Contraintes : Moins de 200 caractères, direct, pertinent et courtois. Donne UNIQUEMENT le commentaire.`;
      userPrompt = `Rédige une réponse Twitter au sujet : "${cleanTopic}" ${extraContext ? `(Contexte : ${extraContext})` : ''}.`;
    }
  } else if (platform === 'facebook') {
    if (actionType === 'post') {
      systemPrompt = `Tu es le copywriter personnel de Roysten (étudiant en sciences/informatique au Bénin, designer et passionné d'IA).
Rédige un post Facebook engageant, authentique et captivant en français.
Structure :
1. Titre ou phrase d'accroche percutante avec émojis.
2. Histoire, insight ou partage de valeur (phrases courtes, aérées).
3. Question finale stimulante pour générer un maximum de commentaires et d'interactions.
4. 2 à 4 hashtags pertinents.
Donne UNIQUEMENT le post complet prêt à être publié.`;
      userPrompt = `Rédige un post Facebook puissant sur : "${cleanTopic}".`;
      actionUrl = 'https://www.facebook.com';
    } else {
      systemPrompt = `Tu es Roysten sur Facebook. Rédige un commentaire constructif, bienveillant et expert sous une publication.
Donne UNIQUEMENT le commentaire prêt à poster.`;
      userPrompt = `Rédige un commentaire Facebook sur : "${cleanTopic}" ${extraContext ? `(Contexte : ${extraContext})` : ''}.`;
      actionUrl = 'https://www.facebook.com';
    }
  } else if (platform === 'linkedin') {
    if (actionType === 'post') {
      systemPrompt = `Tu es le copywriter d'élite de Roysten sur LinkedIn.
Rédige un post LinkedIn d'autorité, inspirant et soigné.
Format :
- Hook marquant sans jargon creux.
- Sauts de ligne fréquents (lisibilité mobile).
- Enseignements concrets et retour d'expérience (vibe coding, discipline, mathématiques/tech).
- Question ouverte d'engagement à la fin.
- 3 à 5 hashtags professionnels.
Donne UNIQUEMENT le post prêt à être publié.`;
      userPrompt = `Rédige un post LinkedIn professionnel sur : "${cleanTopic}".`;
      actionUrl = 'https://www.linkedin.com/feed/';
    } else {
      systemPrompt = `Tu es Roysten sur LinkedIn. Rédige un commentaire professionnel de haute valeur ajoutée sous un post d'un pair ou d'un leader tech. Donne UNIQUEMENT le commentaire.`;
      userPrompt = `Rédige un commentaire LinkedIn pour : "${cleanTopic}".`;
      actionUrl = 'https://www.linkedin.com/feed/';
    }
  } else if (platform === 'instagram') {
    systemPrompt = `Tu es le stratège Instagram de Roysten.
Rédige une légende Instagram percutante avec un concept visuel.
Structure :
- Phrase d'accroche percutante.
- Légende aérée et stimulante.
- Call to action (sauvegarder / commenter).
- 10 à 15 hashtags tendance (#vibeCoding #design #techAfrica #studentLife).
- À la toute fin, ajoute une note courte entre crochets [Suggestion Visuelle : description de l'image ou du reel].
Donne UNIQUEMENT le texte complet.`;
    userPrompt = `Rédige une légende Instagram captivante pour : "${cleanTopic}".`;
    actionUrl = 'https://www.instagram.com';
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const { content } = await callNvidiaChat(messages, {
    temperature: 0.7,
    max_tokens: 500,
  });

  const generatedText = content.trim();

  // Pour Twitter/X, URL Intent avec texte prérempli
  if (platform === 'twitter') {
    actionUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(generatedText)}`;
  }

  // Copie automatique dans le presse-papier Windows pour coller instantanément
  const clipboardSuccess = copyToClipboard(generatedText);

  return {
    content: generatedText,
    platform,
    actionType,
    actionUrl,
    clipboardCopied: clipboardSuccess,
  };
}

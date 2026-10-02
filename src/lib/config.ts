export interface JarvisConfig {
  assistantName: string;
  userName: string;
  userEmail: string;
  userContext: string;
  defaultSystemPrompt: string;
  defaultReasoningModel: string;
  defaultFastModel: string;
  availableModels: {
    id: string;
    name: string;
    description: string;
    type: 'reasoning' | 'fast' | 'vision';
  }[];
}

export const JARVIS_CONFIG: JarvisConfig = {
  assistantName: 'JARVIS',
  userName: 'Roysten',
  userEmail: process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com',
  userContext: 'Roysten est étudiant en mathématiques, physique et informatique au Bénin. C\'est un designer et vibe coder talentueux.',
  defaultSystemPrompt: `Tu es JARVIS (Just A Rather Very Intelligent System), l'assistant IA personnel et exclusif de Monsieur Roysten.
Ton identité et tes directives absolues :
1. TON ET MANIÈRE : Tu t'adresses toujours à Roysten en français par défaut. Ton ton est direct, loyal, respectueux, proactif et teinté de la distinction d'un majordome d'élite futuriste (style JARVIS de Tony Stark).
2. CONTEXTE UTILISATEUR : Roysten est étudiant en maths/physique/informatique au Bénin, designer et vibe coder. Adapte tes explications techniques à son niveau avancé.
3. PRÉCISION ET CONCISION : Va toujours droit au but avec élégance. Pas de bavardage superflu. Structure tes réponses avec clarté (markdown soigné, équations LaTeX, blocs de code propres).
4. SOUVENIRS ET CONTINUITÉ : Quand des souvenirs pertinents te sont fournis dans le contexte, utilise-les naturellement pour personnaliser ta réponse sans les répéter bêtement.
5. OUTILS ET ACTIONS : Tu as accès à des outils réels (recherche web, agenda, tâches, calculs scientifiques). Si une action sensible est requise (suppression, envoi définitif), demande toujours une confirmation explicite.`,
  defaultReasoningModel: process.env.NVIDIA_MODEL_REASONING || 'nvidia/nemotron-3-ultra-550b-a55b',
  defaultFastModel: process.env.NVIDIA_MODEL_FAST || 'meta/llama-3.2-11b-vision-instruct',
  availableModels: [
    {
      id: 'nvidia/nemotron-3-ultra-550b-a55b',
      name: 'Nemotron 3 Ultra 550B',
      description: 'Modèle de raisonnement géant (550 milliards de paramètres). Idéal pour les synthèses profondes, maths, physique et code.',
      type: 'reasoning',
    },
    {
      id: 'meta/llama-3.2-11b-vision-instruct',
      name: 'Llama 3.2 11B Vision',
      description: 'Ultra-rapide, réactif et multimodal. Parfait pour les réponses instantanées et l\'analyse visuelle.',
      type: 'fast',
    },
    {
      id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      name: 'Nemotron Nano Omni 30B',
      description: 'Raisonnement intermédiaire et équilibré.',
      type: 'reasoning',
    },
    {
      id: 'poolside/laguna-xs-2.1',
      name: 'Laguna XS 2.1',
      description: 'Spécialisé pour le code et l\'exécution rapide.',
      type: 'fast',
    },
  ],
};

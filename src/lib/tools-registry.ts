import { saveTask, getTasks } from './db';

export interface ToolDefinition {
  name: string;
  description: string;
  requiresConfirmation?: boolean;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  execute: (args: any, userEmail: string) => Promise<any>;
}

// 1. RECHERCHE WEB (Tavily avec fallback DuckDuckGo)
async function searchWeb(query: string) {
  const tavilyKey = process.env.TAVILY_API_KEY || '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';
  if (tavilyKey) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          max_results: 4,
          search_depth: 'basic',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          source: 'Tavily Search',
          results: data.results.map((r: any) => ({
            title: r.title,
            url: r.url,
            content: r.content,
          })),
        };
      }
    } catch (e) {
      console.warn('[SEARCH] Tavily échoué, passage au fallback DuckDuckGo...');
    }
  }

  // Fallback DuckDuckGo HTML sans clé
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const html = await res.text();
    // Extraction basique des snippets
    const snippets: any[] = [];
    const regex = /<a class="result__snippet[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 3) {
      snippets.push({
        title: 'DuckDuckGo Result',
        url: match[1],
        content: match[2].replace(/<[^>]+>/g, ''),
      });
    }
    return {
      source: 'DuckDuckGo Fallback',
      results: snippets.length > 0 ? snippets : [{ title: query, content: 'Aucun snippet extrait.' }],
    };
  } catch (err: any) {
    return { error: `Recherche impossible: ${err.message}` };
  }
}

// 2. CALCULATRICE MATHS & PHYSIQUE
function safeCalculate(expression: string) {
  try {
    // Nettoyage et sécurité de l'expression mathématique
    const clean = expression.replace(/[^0-9+\-*/().,^ %eEpiPIsincoatlgqrt]/g, '');
    const sanitized = clean
      .replace(/pi/gi, 'Math.PI')
      .replace(/e/g, 'Math.E')
      .replace(/sin\(/g, 'Math.sin(')
      .replace(/cos\(/g, 'Math.cos(')
      .replace(/tan\(/g, 'Math.tan(')
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/log\(/g, 'Math.log10(')
      .replace(/ln\(/g, 'Math.log(')
      .replace(/\^/g, '**');

    // Évaluation sécurisée via constructeur Function restreint
    const func = new Function(`"use strict"; return (${sanitized});`);
    const result = func();
    return {
      expression,
      result: Number.isFinite(result) ? result : 'Expression indéfinie',
    };
  } catch (e: any) {
    return { expression, error: `Erreur de calcul: ${e.message}` };
  }
}

// REGISTRE DE TOUS LES OUTILS
export const TOOLS_REGISTRY: Record<string, ToolDefinition> = {
  web_search: {
    name: 'web_search',
    description: 'Effectue une recherche en temps réel sur le Web et retourne les sources fiables avec citations.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Le sujet ou la question exacte à rechercher' },
      },
      required: ['query'],
    },
    execute: async (args) => await searchWeb(args.query),
  },

  scientific_calculator: {
    name: 'scientific_calculator',
    description: 'Évalue des expressions mathématiques et physiques complexes (trigonométrie, puissances, racines, constantes pi, e).',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Expression mathématique (ex: "sqrt(16) * cos(pi/3) + 2^4")' },
      },
      required: ['expression'],
    },
    execute: async (args) => safeCalculate(args.expression),
  },

  get_current_time: {
    name: 'get_current_time',
    description: 'Renvoie l\'heure exacte et la date actuelle au Bénin (fuseau horaire Afrique/Porto-Novo).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: async () => {
      const now = new Date();
      const beninTime = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Africa/Porto-Novo',
        dateStyle: 'full',
        timeStyle: 'medium',
      }).format(now);
      return { timezone: 'Africa/Porto-Novo (Bénin)', localTime: beninTime };
    },
  },

  create_task: {
    name: 'create_task',
    description: 'Crée une nouvelle tâche ou un rappel dans le système de Roysten.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Titre clair de la tâche' },
        description: { type: 'string', description: 'Détails ou contexte de la tâche' },
        due_date: { type: 'string', description: 'Date d\'échéance au format ISO (ex: 2026-10-05T14:00:00Z)' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Niveau de priorité' },
      },
      required: ['title'],
    },
    execute: async (args, userEmail) => {
      return await saveTask({
        user_email: userEmail,
        title: args.title,
        description: args.description,
        due_date: args.due_date,
        priority: args.priority || 'medium',
      });
    },
  },

  list_tasks: {
    name: 'list_tasks',
    description: 'Récupère la liste des tâches et rappels enregistrés pour Roysten.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: async (_, userEmail) => {
      return await getTasks(userEmail);
    },
  },

  draft_email: {
    name: 'draft_email',
    description: 'Rédige un brouillon d\'email professionnel prêt à être envoyé. (Exige confirmation avant tout envoi réel).',
    requiresConfirmation: true,
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Adresse email du destinataire' },
        subject: { type: 'string', description: 'Objet de l\'email' },
        body: { type: 'string', description: 'Contenu du message rédigé' },
      },
      required: ['to', 'subject', 'body'],
    },
    execute: async (args) => {
      return {
        status: 'Brouillon prêt pour confirmation',
        recipient: args.to,
        subject: args.subject,
        body: args.body,
        message: 'Brouillon généré. Veuillez confirmer l\'envoi définitif.',
      };
    },
  },

  // PILOTAGE DE L'ORDINATEUR (SYSTÈME WINDOWS)
  launch_app: {
    name: 'launch_app',
    description: 'Lance une application installée sur l\'ordinateur de Roysten (VS Code, Chrome, Bloc-notes, Calculatrice, Explorateur de fichiers, Spotify, etc.)',
    parameters: {
      type: 'object',
      properties: {
        appName: { type: 'string', description: 'Nom de l\'application (ex: "vscode", "chrome", "calc", "notepad", "explorer")' },
        targetPath: { type: 'string', description: 'Fichier ou dossier cible à ouvrir avec l\'application (optionnel)' },
      },
      required: ['appName'],
    },
    execute: async (args) => {
      const { launchApp } = await import('./system-controller');
      return await launchApp(args.appName, args.targetPath);
    },
  },

  open_url_on_pc: {
    name: 'open_url_on_pc',
    description: 'Ouvre un site web ou une URL directement dans le navigateur de l\'ordinateur.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'L\'URL complète à ouvrir (ex: "https://youtube.com", "https://github.com")' },
      },
      required: ['url'],
    },
    execute: async (args) => {
      const { openUrl } = await import('./system-controller');
      return await openUrl(args.url);
    },
  },

  get_pc_telemetry: {
    name: 'get_pc_telemetry',
    description: 'Récupère les statistiques matérielles de l\'ordinateur en temps réel (mémoire RAM utilisée/libre, processeur, état du système).',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    execute: async () => {
      const { getSystemStats } = await import('./system-controller');
      return getSystemStats();
    },
  },

  browse_local_folder: {
    name: 'browse_local_folder',
    description: 'Inspecte et liste les fichiers d\'un dossier sur l\'ordinateur de Roysten.',
    parameters: {
      type: 'object',
      properties: {
        folderPath: { type: 'string', description: 'Chemin du dossier (laisser vide pour le dossier Documents)' },
      },
      required: [],
    },
    execute: async (args) => {
      const { inspectDirectory } = await import('./system-controller');
      return inspectDirectory(args.folderPath);
    },
  },
};

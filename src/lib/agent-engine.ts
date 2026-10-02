import { callNvidiaChat } from './nvidia';
import { TOOLS_REGISTRY, ToolDefinition } from './tools-registry';
import { JARVIS_CONFIG } from './config';

export interface AgentStepLog {
  step: number;
  thought: string;
  action?: string;
  actionInput?: any;
  observation?: any;
  status: 'running' | 'completed' | 'error';
}

export interface AgentExecutionReport {
  goal: string;
  success: boolean;
  finalAnswer: string;
  steps: AgentStepLog[];
  totalSteps: number;
}

export async function runAgentLoop(
  goal: string,
  userEmail: string,
  onStepUpdate?: (step: AgentStepLog) => void
): Promise<AgentExecutionReport> {
  const steps: AgentStepLog[] = [];
  const MAX_STEPS = 5;

  const availableToolsList = Object.values(TOOLS_REGISTRY).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  const systemPrompt = `Tu es le moteur autonome d'action de JARVIS.
Ton rôle est de résoudre l'objectif de Roysten en décomposant le problème de façon méthodique : Pensée -> Action -> Observation -> Conclusion.

OUTILS DISPONIBLES :
${JSON.stringify(availableToolsList, null, 2)}

FORMAT DE SORTIE STRICT : À chaque étape, réponds UNIQUEMENT par un JSON valide avec ce format :
Si tu dois appeler un outil :
{
  "thought": "Ton analyse et raisonnement logique sur l'étape actuelle",
  "action": "nom_de_l_outil",
  "actionInput": { "param1": "valeur" }
}

Si tu as toutes les informations pour conclure et répondre à l'objectif :
{
  "thought": "Synthèse finale",
  "finalAnswer": "Rapport complet, élégant et structuré en français pour Roysten"
}`;

  let history: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `OBJECTIF DE ROYSTEN : "${goal}"\nCommence par la première étape.` },
  ];

  for (let currentStep = 1; currentStep <= MAX_STEPS; currentStep++) {
    const stepLog: AgentStepLog = {
      step: currentStep,
      thought: 'Raisonnement en cours...',
      status: 'running',
    };

    if (onStepUpdate) onStepUpdate(stepLog);

    try {
      const { content } = await callNvidiaChat(history, {
        model: JARVIS_CONFIG.defaultReasoningModel,
        temperature: 0.2,
      });

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Réponse invalide du modèle agent (JSON introuvable)');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      stepLog.thought = parsed.thought || 'Étape traitée.';

      // Si l'agent a terminé
      if (parsed.finalAnswer) {
        stepLog.status = 'completed';
        steps.push(stepLog);
        if (onStepUpdate) onStepUpdate(stepLog);

        return {
          goal,
          success: true,
          finalAnswer: parsed.finalAnswer,
          steps,
          totalSteps: currentStep,
        };
      }

      // Si l'agent invoque un outil
      if (parsed.action) {
        stepLog.action = parsed.action;
        stepLog.actionInput = parsed.actionInput;

        const tool = TOOLS_REGISTRY[parsed.action];
        if (!tool) {
          stepLog.observation = `Erreur: L'outil "${parsed.action}" n'existe pas.`;
          stepLog.status = 'error';
        } else {
          try {
            const result = await tool.execute(parsed.actionInput || {}, userEmail);
            stepLog.observation = result;
            stepLog.status = 'completed';
          } catch (toolErr: any) {
            stepLog.observation = `Échec de l'outil : ${toolErr.message}`;
            stepLog.status = 'error';
          }
        }

        steps.push(stepLog);
        if (onStepUpdate) onStepUpdate(stepLog);

        // Ajout au fil de discussion ReAct
        history.push({ role: 'assistant', content: JSON.stringify(parsed) });
        history.push({
          role: 'user',
          content: `OBSERVATION DE L'OUTIL "${parsed.action}" :\n${JSON.stringify(stepLog.observation)}\nContinue vers l'étape suivante ou fournis "finalAnswer".`,
        });
      }
    } catch (err: any) {
      stepLog.status = 'error';
      stepLog.thought = `Erreur lors de l'étape : ${err.message}`;
      steps.push(stepLog);
      if (onStepUpdate) onStepUpdate(stepLog);
      break;
    }
  }

  return {
    goal,
    success: false,
    finalAnswer: 'La limite d\'étapes autorisées a été atteinte avant la conclusion définitive.',
    steps,
    totalSteps: steps.length,
  };
}

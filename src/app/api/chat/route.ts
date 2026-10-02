import { NextRequest, NextResponse } from 'next/server';
import { JARVIS_CONFIG } from '@/lib/config';
import { callNvidiaChat, createNvidiaStream, ChatMessage } from '@/lib/nvidia';
import { getMessages, saveMessage, createConversation } from '@/lib/db';
import { getRelevantMemories, extractAndSaveMemories } from '@/lib/memory-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      image,
      conversationId,
      model,
      stream = true,
      userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com',
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message manquant ou invalide' }, { status: 400 });
    }

    // 1. Initialiser ou récupérer la conversation
    let convId = conversationId;
    if (!convId) {
      const newConv = await createConversation(userEmail, message.slice(0, 40) + '...');
      convId = newConv.id;
    }

    // 2. Enregistrer le message utilisateur
    await saveMessage({
      conversation_id: convId,
      role: 'user',
      content: image ? `${message}\n\n[Capture d'écran / Image analysée]` : message,
    });

    // 3. Détection et exécution réelle des ordres système sur Windows
    let actionExecutedNote = '';
    const lower = message.toLowerCase();

    if (lower.includes('ouvre') || lower.includes('lance') || lower.includes('demarre') || lower.includes('démarrer') || lower.includes('start')) {
      const { launchApp, openUrl } = await import('@/lib/system-controller');

      if (lower.includes('vs') || lower.includes('code')) {
        await launchApp('vscode');
        actionExecutedNote = '✓ [ACTION SYSTÈME RÉELLE EXÉCUTÉE] : Visual Studio Code a été lancé physiquement sur votre écran Windows.';
      } else if (lower.includes('calc')) {
        await launchApp('calc');
        actionExecutedNote = '✓ [ACTION SYSTÈME RÉELLE EXÉCUTÉE] : La calculatrice a été lancée sur votre écran.';
      } else if (lower.includes('notepad') || lower.includes('bloc')) {
        await launchApp('notepad');
        actionExecutedNote = '✓ [ACTION SYSTÈME RÉELLE EXÉCUTÉE] : Le bloc-notes a été ouvert sur votre bureau.';
      } else if (lower.includes('chrome')) {
        await launchApp('chrome');
        actionExecutedNote = '✓ [ACTION SYSTÈME RÉELLE EXÉCUTÉE] : Google Chrome a été lancé.';
      } else if (lower.includes('explorer') || lower.includes('fichier') || lower.includes('dossier')) {
        await launchApp('explorer');
        actionExecutedNote = '✓ [ACTION SYSTÈME RÉELLE EXÉCUTÉE] : L\'explorateur de fichiers a été ouvert.';
      } else if (lower.includes('terminal') || lower.includes('powershell')) {
        await launchApp('terminal');
        actionExecutedNote = '✓ [ACTION SYSTÈME RÉELLE EXÉCUTÉE] : Le terminal PowerShell a été ouvert.';
      } else if (lower.includes('spotify')) {
        await launchApp('spotify');
        actionExecutedNote = '✓ [ACTION SYSTÈME RÉELLE EXÉCUTÉE] : Spotify a été lancé.';
      } else if (lower.includes('whatsapp')) {
        await launchApp('whatsapp');
        actionExecutedNote = '✓ [ACTION SYSTÈME RÉELLE EXÉCUTÉE] : WhatsApp Desktop a été lancé.';
      } else if (lower.includes('youtube')) {
        await openUrl('https://youtube.com');
        actionExecutedNote = '✓ [ACTION SYSTÈME RÉELLE EXÉCUTÉE] : YouTube a été ouvert dans votre navigateur.';
      } else if (lower.includes('github')) {
        await openUrl('https://github.com');
        actionExecutedNote = '✓ [ACTION SYSTÈME RÉELLE EXÉCUTÉE] : GitHub a été ouvert dans votre navigateur.';
      }
    }

    // 3.5 Détection demande de point / briefing
    if (lower.includes('point sur') || lower.includes('fais-moi le point') || lower.includes('fais le point') || lower.includes('briefing')) {
      const { generateMorningBriefing } = await import('@/lib/briefing-service');
      const briefingData = await generateMorningBriefing(userEmail);
      actionExecutedNote = `✓ [DONNÉES DU POINT EN TEMPS RÉEL RÉCUPÉRÉES] : ${briefingData}`;
    }

    // 4. Rappel des souvenirs pertinents pour Roysten
    const relevantMemoriesContext = await getRelevantMemories(userEmail, message);

    // 5. Récupérer l'historique récent de la conversation
    const history = await getMessages(convId);
    const recentHistory: ChatMessage[] = history.slice(-8).map((m: any) => ({
      role: m.role as any,
      content: m.content,
    }));

    // 6. Assembler le prompt système complet avec consigne d'action réelle
    const fullSystemPrompt = `${JARVIS_CONFIG.defaultSystemPrompt}
${relevantMemoriesContext}
${actionExecutedNote ? `\n[NOTE SYSTÈME CRITIQUE : Tu viens d'exécuter réellement cette action ou de récupérer ces données pour Roysten : "${actionExecutedNote}".\nINTERDICTION FORMELLE : Ne simule JAMAIS une ouverture d'application dans ta réponse, ne dessine AUCUN faux bloc de code ou cadre ASCII pour faire semblant d'être une application, ne dis JAMAIS que tu vas simuler. Confirme sobrement et avec la classe d'un majordome futuriste que l'ordre est exécuté.]` : ''}`;

    // Préparer le message utilisateur actuel (avec image si fournie)
    const userCurrentContent: any = image
      ? [
          { type: 'text', text: message },
          { type: 'image_url', image_url: { url: image } },
        ]
      : message;

    const promptMessages: ChatMessage[] = [
      { role: 'system', content: fullSystemPrompt },
      ...recentHistory.slice(0, -1),
      { role: 'user', content: userCurrentContent },
    ];

    // Si une image est fournie, forcer le modèle de vision
    const modelToUse = image ? 'meta/llama-3.2-11b-vision-instruct' : (model || JARVIS_CONFIG.defaultFastModel);

    // Si streaming demandé
    if (stream) {
      try {
        const nvidiaStream = await createNvidiaStream(promptMessages, {
          model: modelToUse,
          temperature: 0.3,
        });

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let fullReply = '';

        const customStream = new ReadableStream({
          async start(controller) {
            // Envoyer d'abord l'ID de conversation au client
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ conversationId: convId, type: 'start' })}\n\n`)
            );

            const reader = nvidiaStream.getReader();
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed === 'data: [DONE]') continue;
                  if (trimmed.startsWith('data: ')) {
                    try {
                      const parsed = JSON.parse(trimmed.slice(6));
                      const delta = parsed.choices?.[0]?.delta?.content || '';
                      if (delta) {
                        fullReply += delta;
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                        );
                      }
                    } catch (e) {
                      // chunk incomplet, ignorer
                    }
                  }
                }
              }

              // Enregistrer la réponse de Jarvis dans la base
              if (fullReply) {
                await saveMessage({
                  conversation_id: convId,
                  role: 'assistant',
                  content: fullReply,
                });

                // Extraction en tâche de fond de souvenirs durables
                extractAndSaveMemories(userEmail, message, fullReply).catch((err) =>
                  console.error('[EXTRACTION MEM] Erreur:', err)
                );
              }

              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            } catch (err: any) {
              controller.error(err);
            }
          },
        });

        return new Response(customStream, {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        });
      } catch (streamError: any) {
        console.warn('[CHAT] Échec du streaming, bascule sur completion standard:', streamError.message);
      }
    }

    // Fallback standard (sans stream)
    const { content: replyContent, modelUsed } = await callNvidiaChat(promptMessages, {
      model: modelToUse,
      temperature: 0.3,
    });

    await saveMessage({
      conversation_id: convId,
      role: 'assistant',
      content: replyContent,
    });

    // Extraction asynchrone des souvenirs
    extractAndSaveMemories(userEmail, message, replyContent).catch(() => {});

    return NextResponse.json({
      conversationId: convId,
      role: 'assistant',
      content: replyContent,
      modelUsed,
    });
  } catch (error: any) {
    console.error('[API CHAT ERROR]', error);
    return NextResponse.json(
      {
        error: 'Erreur lors du traitement de la requête JARVIS',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

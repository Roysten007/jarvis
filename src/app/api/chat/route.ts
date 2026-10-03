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

    // Récupérer le dernier message de l'assistant avant d'ajouter le message actuel
    const existingMessages = await getMessages(convId);
    const lastAssistantMsg = [...existingMessages].reverse().find((m: any) => m.role === 'assistant')?.content;

    // 2. Enregistrer le message utilisateur
    await saveMessage({
      conversation_id: convId,
      role: 'user',
      content: image ? `${message}\n\n[Capture d'écran / Image analysée]` : message,
    });

    // 3. Détection et exécution réelle des ordres système sur Windows
    const { executeSystemCommand } = await import('@/lib/system-controller');
    const systemResult = await executeSystemCommand(message, lastAssistantMsg);

    let actionExecutedNote = '';
    if (systemResult.executed) {
      actionExecutedNote = systemResult.actionNote || '';

      // Si c'est un ordre direct pur (ex: "Allume VS Code", "lance Spotify", "écris un message à Roysten sur WhatsApp : salut")
      // On répond instantanément avec la formule de majordome d'élite sans passer par un LLM qui hallucinerait des cours Wikipédia
      if (systemResult.isPureCommand && systemResult.directReply) {
        const directReply = systemResult.directReply;
        await saveMessage({
          conversation_id: convId,
          role: 'assistant',
          content: directReply,
        });

        if (stream) {
          const encoder = new TextEncoder();
          const customStream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ conversationId: convId, type: 'start' })}\n\n`)
              );
              if (systemResult.clientAction) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ clientAction: systemResult.clientAction })}\n\n`)
                );
              }
              // Émission fluide mot par mot
              const words = directReply.split(' ');
              words.forEach((w, i) => {
                const chunk = (i === 0 ? '' : ' ') + w;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
              });
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
          });

          return new Response(customStream, {
            headers: {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
            },
          });
        }

        return NextResponse.json({
          conversationId: convId,
          reply: directReply,
          clientAction: systemResult.clientAction,
          modelUsed: 'system-pilot',
        });
      }
    }

    // 3.3 Bascule de langue (Anglais / Français)
    const lower = message.toLowerCase();
    let languageDirective = '';
    if (lower.includes('en anglais') || lower.includes('in english') || lower.includes('speak english') || lower.includes('talk in english')) {
      languageDirective = '\n[DIRECTIVE LINGUISTIQUE : Roysten souhaite pratiquer son anglais. Réponds-lui entièrement en anglais fluide, élégant et soigné (style JARVIS britannique). Tu peux ajouter à la toute fin un petit tip de vocabulaire ou de grammaire si utile.]';
    } else if (lower.includes('en français') || lower.includes('reviens en français') || lower.includes('parle en français')) {
      languageDirective = '\n[DIRECTIVE LINGUISTIQUE : Repasse immédiatement et entièrement en français d\'élite pour Roysten.]';
    }

    // 3.5 Détection demande de point / briefing
    if (lower.includes('point sur') || lower.includes('fais-moi le point') || lower.includes('fais le point') || lower.includes('briefing')) {
      const { generateMorningBriefing } = await import('@/lib/briefing-service');
      const briefingData = await generateMorningBriefing(userEmail);
      actionExecutedNote = `Données du point récupérées en temps réel : ${briefingData}`;
    }

    // 4. Rappel des souvenirs pertinents pour Roysten
    const relevantMemoriesContext = await getRelevantMemories(userEmail, message);

    // 5. Récupérer l'historique récent de la conversation
    const history = await getMessages(convId);
    const recentHistory: ChatMessage[] = history.slice(-8).map((m: any) => ({
      role: m.role as any,
      content: m.content,
    }));

    // 5.5 Injecter le profil officiel, tarifs et offres de Roysten
    const { getRoystenContextPrompt } = await import('@/lib/roysten-profile');
    const roystenProfileContext = getRoystenContextPrompt();

    // 6. Assembler le prompt système complet avec consigne d'action réelle
    const fullSystemPrompt = `${JARVIS_CONFIG.defaultSystemPrompt}
${roystenProfileContext}
${relevantMemoriesContext}
${languageDirective}
${actionExecutedNote ? `\n[ACTION RÉELLE ACCOMPLIE : "${actionExecutedNote}". Confirme sobrement et avec la distinction du majordome JARVIS de Tony Stark que l'action est réalisée. Ne recopie AUCUNE étiquette système entre crochets, ne simule pas d'interface en texte ASCII/code.]` : ''}`;

    // Préparer le message utilisateur actuel (avec image si fournie ou capture d'écran)
    const effectiveImage = image || systemResult.screenshotDataUrl;
    const userCurrentContent: any = effectiveImage
      ? [
          { type: 'text', text: message },
          { type: 'image_url', image_url: { url: effectiveImage } },
        ]
      : message;

    const promptMessages: ChatMessage[] = [
      { role: 'system', content: fullSystemPrompt },
      ...recentHistory.slice(0, -1),
      { role: 'user', content: userCurrentContent },
    ];

    // Si une image ou capture est fournie, forcer le modèle de vision multimodal
    const modelToUse = effectiveImage ? 'meta/llama-3.2-11b-vision-instruct' : (model || JARVIS_CONFIG.defaultFastModel);

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
            if (systemResult.clientAction) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ clientAction: systemResult.clientAction })}\n\n`)
              );
            }

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
      clientAction: systemResult.clientAction,
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

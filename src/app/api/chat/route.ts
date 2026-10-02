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

    // 3. Rappel des souvenirs pertinents pour Roysten
    const relevantMemoriesContext = await getRelevantMemories(userEmail, message);

    // 4. Récupérer l'historique récent de la conversation (derniers 10 messages)
    const history = await getMessages(convId);
    const recentHistory: ChatMessage[] = history.slice(-8).map((m: any) => ({
      role: m.role as any,
      content: m.content,
    }));

    // 5. Assembler le prompt système complet avec souvenirs injectés
    const fullSystemPrompt = `${JARVIS_CONFIG.defaultSystemPrompt}
${relevantMemoriesContext}`;

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

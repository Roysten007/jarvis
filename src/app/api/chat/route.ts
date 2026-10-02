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

    // 3.1 Ordres d'OUVERTURE / LANCEMENT
    // 3.0 Actions spécifiques dans les applications (ex: WhatsApp message)
    if (
      lower.includes('whatsapp') &&
      (lower.includes('écris') || lower.includes('ecris') || lower.includes('envoie') || lower.includes('message') || lower.includes('dis à') || lower.includes('dis a'))
    ) {
      const { sendWhatsAppMessage } = await import('@/lib/system-controller');
      // Extraction du destinataire (ex: "à roysten", "a roysten")
      const contactMatch = message.match(/(?:à|a)\s+([a-zA-Z0-9_\-\+]+)/i);
      const contactName = contactMatch ? contactMatch[1].trim() : '';

      let msgToSend = '';
      if (message.includes(':')) {
        msgToSend = message.split(':')[1]?.trim();
      } else if (lower.includes('disant que')) {
        msgToSend = message.split(/disant que/i)[1]?.trim();
      } else if (lower.includes('pour lui dire')) {
        msgToSend = message.split(/pour lui dire(?:\s+que)?/i)[1]?.trim();
      } else {
        if (contactName) {
          msgToSend = `Salut ${contactName} ! Message préparé via JARVIS.`;
        } else {
          msgToSend = 'Bonjour ! Message envoyé depuis JARVIS Assistant.';
        }
      }

      if (!msgToSend || msgToSend.length < 2) {
        msgToSend = contactName ? `Salut ${contactName} !` : 'Bonjour !';
      }

      await sendWhatsAppMessage(msgToSend, contactName);
      actionExecutedNote = `WhatsApp a été ouvert au premier plan sur votre écran avec le message prêt pour ${contactName || 'votre contact'} : "${msgToSend}".`;
    }

    // 3.1 Spotify avec recherche d'artiste ou morceau
    else if (
      (lower.includes('spotify') && (lower.includes('mets') || lower.includes('joue') || lower.includes('lance') || lower.includes('cherche'))) ||
      lower.includes('mets de la musique') ||
      lower.includes('joue de la musique')
    ) {
      const { playSpotify } = await import('@/lib/system-controller');
      let query = '';
      const match = message.match(/(?:mets|joue|lance|cherche)\s+(?:de\s+la\s+musique|du|de|des)?\s*(.*?)(?:\s+sur\s+spotify|$)/i);
      if (match && match[1] && !match[1].toLowerCase().includes('musique')) {
        query = match[1].trim();
      }
      await playSpotify(query);
      actionExecutedNote = query
        ? `Spotify a été lancé et recherche "${query}" pour lecture immédiate.`
        : `Spotify a été lancé au premier plan sur votre écran.`;
    }

    // 3.2 Recherche YouTube
    else if (lower.includes('youtube') && (lower.includes('cherche') || lower.includes('regarde') || lower.includes('trouve'))) {
      const { searchYouTube } = await import('@/lib/system-controller');
      const match = message.match(/cherche\s+(.*?)\s+sur\s+youtube/i) || message.match(/sur\s+youtube\s+(.*)/i);
      const query = match ? match[1].trim() : 'tutoriels';
      await searchYouTube(query);
      actionExecutedNote = `YouTube a été ouvert avec la recherche : "${query}".`;
    }

    // 3.3 Recherche Google
    else if (lower.includes('google') && (lower.includes('cherche') || lower.includes('trouve'))) {
      const { searchGoogle } = await import('@/lib/system-controller');
      const match = message.match(/cherche\s+(.*?)\s+sur\s+google/i);
      const query = match ? match[1].trim() : '';
      await searchGoogle(query);
      actionExecutedNote = `Google Chrome a été ouvert avec la recherche : "${query}".`;
    }

    // 3.4 Ordres d'OUVERTURE / LANCEMENT D'APPLICATIONS
    else if (
      lower.includes('ouvre') ||
      lower.includes('lance') ||
      lower.includes('demarre') ||
      lower.includes('démarrer') ||
      lower.includes('start') ||
      lower.includes('va sur')
    ) {
      const { launchApp, openUrl } = await import('@/lib/system-controller');

      if (lower.includes('vs') || lower.includes('code') || lower.includes('zcode')) {
        await launchApp('vscode');
        actionExecutedNote = 'Visual Studio Code a été lancé au premier plan sur votre écran avec le projet Jarvis.';
      } else if (lower.includes('spotify')) {
        await launchApp('spotify');
        actionExecutedNote = 'Spotify a été lancé au premier plan sur votre écran.';
      } else if (lower.includes('whatsapp')) {
        await launchApp('whatsapp');
        actionExecutedNote = 'WhatsApp Desktop a été ouvert au premier plan sur votre écran.';
      } else if (lower.includes('canva')) {
        await launchApp('canva');
        actionExecutedNote = 'Canva a été ouvert sur votre écran.';
      } else if (lower.includes('capcut')) {
        await launchApp('capcut');
        actionExecutedNote = 'CapCut a été ouvert sur votre écran.';
      } else if (lower.includes('word') || lower.includes('texte')) {
        await launchApp('word');
        actionExecutedNote = 'Microsoft Word a été ouvert sur votre écran.';
      } else if (lower.includes('excel') || lower.includes('tableur')) {
        await launchApp('excel');
        actionExecutedNote = 'Microsoft Excel a été ouvert sur votre écran.';
      } else if (lower.includes('powerpoint') || lower.includes('slide')) {
        await launchApp('powerpoint');
        actionExecutedNote = 'Microsoft PowerPoint a été ouvert sur votre écran.';
      } else if (lower.includes('notepad') || lower.includes('bloc')) {
        await launchApp('notepad');
        actionExecutedNote = 'Le Bloc-notes Windows a été ouvert sur votre écran.';
      } else if (lower.includes('chrome')) {
        await launchApp('chrome');
        actionExecutedNote = 'Google Chrome a été lancé.';
      } else if (lower.includes('edge') || lower.includes('navigateur') || lower.includes('internet')) {
        await launchApp('edge');
        actionExecutedNote = 'Le navigateur Microsoft Edge a été ouvert.';
      } else if (lower.includes('explorer') || lower.includes('fichier') || lower.includes('dossier') || lower.includes('document')) {
        await launchApp('explorer');
        actionExecutedNote = 'L\'explorateur de fichiers Windows a été ouvert.';
      } else if (lower.includes('terminal') || lower.includes('powershell') || lower.includes('console')) {
        await launchApp('terminal');
        actionExecutedNote = 'Le terminal PowerShell a été ouvert sur l\'écran.';
      } else if (lower.includes('paint') || lower.includes('dessin')) {
        await launchApp('paint');
        actionExecutedNote = 'Microsoft Paint a été ouvert sur l\'écran.';
      } else if (lower.includes('youtube')) {
        await openUrl('https://youtube.com');
        actionExecutedNote = 'YouTube a été ouvert dans votre navigateur.';
      } else if (lower.includes('facebook')) {
        await openUrl('https://facebook.com');
        actionExecutedNote = 'Facebook a été ouvert dans votre navigateur.';
      } else if (lower.includes('linkedin')) {
        await openUrl('https://linkedin.com');
        actionExecutedNote = 'LinkedIn a été ouvert dans votre navigateur.';
      } else if (lower.includes('twitter') || lower.includes('sur x')) {
        await openUrl('https://x.com');
        actionExecutedNote = 'X (Twitter) a été ouvert dans votre navigateur.';
      } else if (lower.includes('github')) {
        await openUrl('https://github.com');
        actionExecutedNote = 'GitHub a été ouvert dans votre navigateur.';
      } else if (lower.includes('google')) {
        await openUrl('https://google.com');
        actionExecutedNote = 'Google a été ouvert dans votre navigateur.';
      } else if (lower.includes('gmail') || lower.includes('mail')) {
        await openUrl('https://mail.google.com');
        actionExecutedNote = 'Gmail a été ouvert dans votre navigateur.';
      }
    }

    // 3.2 Ordres de FERMETURE d'applications
    if (lower.includes('ferme') || lower.includes('quitte') || lower.includes('arrête') || lower.includes('arrete') || lower.includes('stop app')) {
      const { closeApp } = await import('@/lib/system-controller');
      if (lower.includes('vs') || lower.includes('code')) {
        await closeApp('vscode');
        actionExecutedNote = 'Visual Studio Code a été fermé.';
      } else if (lower.includes('chrome')) {
        await closeApp('chrome');
        actionExecutedNote = 'Google Chrome a été fermé.';
      } else if (lower.includes('calc')) {
        await closeApp('calc');
        actionExecutedNote = 'La calculatrice a été fermée.';
      } else if (lower.includes('notepad') || lower.includes('bloc')) {
        await closeApp('notepad');
        actionExecutedNote = 'Le Bloc-notes a été fermé.';
      } else if (lower.includes('spotify')) {
        await closeApp('spotify');
        actionExecutedNote = 'Spotify a été arrêté.';
      } else if (lower.includes('whatsapp')) {
        await closeApp('whatsapp');
        actionExecutedNote = 'WhatsApp a été fermé.';
      }
    }

    // 3.3 Bascule de langue (Anglais / Français)
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

    // 6. Assembler le prompt système complet avec consigne d'action réelle
    const fullSystemPrompt = `${JARVIS_CONFIG.defaultSystemPrompt}
${relevantMemoriesContext}
${languageDirective}
${actionExecutedNote ? `\n[ACTION RÉELLE ACCOMPLIE : "${actionExecutedNote}". Confirme sobrement et avec la distinction du majordome JARVIS de Tony Stark que l'action est réalisée. Ne recopie AUCUNE étiquette système entre crochets, ne simule pas d'interface en texte ASCII/code.]` : ''}`;

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

import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// Cache en mémoire pour les phrases récurrentes de JARVIS (max 100)
const audioCache = new Map<string, Buffer>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { text, lang = 'fr', voice } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Texte requis' }, { status: 400 });
    }

    // Nettoyer les balises Markdown, blocs de code, emojis et URLs
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // Blocs de code entiers
      .replace(/`[^`]*`/g, '')        // Code inline
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Liens markdown [texte](url) -> texte
      .replace(/[*#_~[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[👉🎵💬💻🎨🎬▶️🔍☀️⚡🤖🔥]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Si le texte est vide après nettoyage, répondre 200 { empty: true } sans faire d'erreur
    if (!cleanText || cleanText.length < 2) {
      return NextResponse.json({ empty: true, message: 'Texte vide ou trop court pour la synthèse' }, { status: 200 });
    }

    // Limiter la taille max pour réactivité instantanée
    const textToSpeak = cleanText.length > 500 ? cleanText.substring(0, 500) + '...' : cleanText;

    // fr-FR-RemyMultilingualNeural : voix studio naturelle et chaleureuse
    // en-GB-RyanNeural : voix britannique d'élite fidèle au JARVIS de Tony Stark
    const voiceName = voice || (lang === 'en' ? 'en-GB-RyanNeural' : 'fr-FR-RemyMultilingualNeural');
    const cacheKey = `${voiceName}:${textToSpeak}`;

    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey)!;
      return new NextResponse(new Uint8Array(cached), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cached.length.toString(),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(textToSpeak);

    const chunks: Buffer[] = [];

    // Timeout de sécurité 10s pour ne jamais bloquer la requête
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
        audioStream.on('end', () => {
          try { tts.close(); } catch (e) {}
          resolve();
        });
        audioStream.on('error', (err: any) => {
          try { tts.close(); } catch (e) {}
          reject(err);
        });
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          try { tts.close(); } catch (e) {}
          reject(new Error('MsEdgeTTS timeout (10s)'));
        }, 10000);
      }),
    ]);

    const fullBuffer = Buffer.concat(chunks);

    if (audioCache.size > 100) {
      const firstKey = audioCache.keys().next().value;
      if (firstKey) audioCache.delete(firstKey);
    }
    audioCache.set(cacheKey, fullBuffer);

    return new NextResponse(new Uint8Array(fullBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fullBuffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('[TTS_API_ERROR]', error);
    return NextResponse.json({ error: error.message || 'Erreur TTS' }, { status: 500 });
  }
}

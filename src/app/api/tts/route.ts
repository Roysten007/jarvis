import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export async function POST(req: NextRequest) {
  try {
    const { text, lang = 'fr' } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Texte requis' }, { status: 400 });
    }

    // Nettoyer les balises Markdown, code et URLs
    const cleanText = text
      .replace(/[*#`_~[\]()]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    if (!cleanText) {
      return NextResponse.json({ error: 'Texte vide après nettoyage' }, { status: 400 });
    }

    // Limiter la taille max pour réactivité instantanée
    const textToSpeak = cleanText.length > 500 ? cleanText.substring(0, 500) + '...' : cleanText;

    const tts = new MsEdgeTTS();
    const voiceName = lang === 'en' ? 'en-US-ChristopherNeural' : 'fr-FR-HenriNeural';

    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(textToSpeak);

    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => {
        tts.close();
        resolve();
      });
      audioStream.on('error', (err: any) => {
        tts.close();
        reject(err);
      });
    });

    const fullBuffer = Buffer.concat(chunks);

    return new NextResponse(fullBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': fullBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[TTS_API_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

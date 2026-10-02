import { NextRequest, NextResponse } from 'next/server';
import { getConversations, getMemories, getTasks } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com';
    const conversations = await getConversations(userEmail);
    const memories = await getMemories(userEmail);
    const tasks = await getTasks(userEmail);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: userEmail,
      version: '1.0.0',
      system: 'JARVIS AI System',
      data: {
        conversations,
        memories,
        tasks,
      },
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="jarvis-backup-${Date.now()}.json"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { confirmation } = await req.json();
    if (confirmation !== 'RESET_JARVIS_DEFINITIF') {
      return NextResponse.json({ error: 'Code de confirmation incorrect' }, { status: 400 });
    }

    const dataFile = path.join(process.cwd(), '.data', 'jarvis-store.json');
    if (fs.existsSync(dataFile)) {
      fs.unlinkSync(dataFile);
    }

    return NextResponse.json({ success: true, message: 'Données locales réinitialisées.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

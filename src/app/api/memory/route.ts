import { NextRequest, NextResponse } from 'next/server';
import { getMemories, saveMemory, deleteMemory } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com';

    const memories = await getMemories(userEmail, category);
    return NextResponse.json({ memories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com';
    const { category, fact, importance, tags } = body;

    if (!fact || !category) {
      return NextResponse.json({ error: 'Catégorie et fait requis' }, { status: 400 });
    }

    const saved = await saveMemory({
      user_email: userEmail,
      category,
      fact,
      importance: Number(importance) || 3,
      tags: Array.isArray(tags) ? tags : [],
    });

    return NextResponse.json({ memory: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    await deleteMemory(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

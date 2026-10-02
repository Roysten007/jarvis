import { NextRequest, NextResponse } from 'next/server';
import { getTasks, saveTask, updateTaskStatus } from '@/lib/db';

export async function GET() {
  try {
    const userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com';
    const tasks = await getTasks(userEmail);
    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com';
    const { title, description, due_date, priority } = body;

    if (!title) {
      return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
    }

    const task = await saveTask({
      user_email: userEmail,
      title,
      description,
      due_date,
      priority,
    });

    return NextResponse.json({ task });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID et statut requis' }, { status: 400 });
    }

    await updateTaskStatus(id, status);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

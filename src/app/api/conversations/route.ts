import { NextRequest, NextResponse } from 'next/server';
import { getConversations, createConversation, getMessages } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const convId = searchParams.get('id');
    const userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com';

    if (convId) {
      const messages = await getMessages(convId);
      return NextResponse.json({ messages });
    }

    const conversations = await getConversations(userEmail);
    return NextResponse.json({ conversations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com';
    const title = body.title || 'Nouvelle session';

    const conv = await createConversation(userEmail, title);
    return NextResponse.json({ conversation: conv });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

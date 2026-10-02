import { NextRequest, NextResponse } from 'next/server';
import { callNvidiaChat } from '@/lib/nvidia';
import { JARVIS_CONFIG } from '@/lib/config';

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message en anglais requis' }, { status: 400 });
    }

    const prompt = `You are JARVIS acting as an elite Technical English Coach for Roysten (software engineering, physics, math, AI).
The user just sent this message:
"${message}"

Instructions:
1. Provide a direct, constructive feedback in French on their English:
   - Point out any grammatical issues, unnatural phrasing, or vocabulary choices.
   - Suggest the native/idiomatic engineering equivalent (e.g. what Silicon Valley / CERN engineers would say).
2. Continue the conversation naturally in clean, natural English to keep the practice going.
Keep your response concise, sharp, and structured.`;

    const { content } = await callNvidiaChat(
      [
        { role: 'system', content: JARVIS_CONFIG.defaultSystemPrompt },
        { role: 'user', content: prompt },
      ],
      {
        model: JARVIS_CONFIG.defaultFastModel,
        temperature: 0.3,
      }
    );

    return NextResponse.json({ reply: content });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

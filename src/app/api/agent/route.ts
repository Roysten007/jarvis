import { NextRequest, NextResponse } from 'next/server';
import { runAgentLoop } from '@/lib/agent-engine';

export const maxDuration = 60; // Support Vercel serverless longer execution

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { goal, userEmail = process.env.ALLOWED_USER_EMAIL || 'kossoumichelroystenseweto@gmail.com' } = body;

    if (!goal || typeof goal !== 'string') {
      return NextResponse.json({ error: 'Objectif manquant ou invalide' }, { status: 400 });
    }

    const report = await runAgentLoop(goal, userEmail);
    return NextResponse.json(report);
  } catch (err: any) {
    console.error('[API AGENT ERROR]', err);
    return NextResponse.json(
      {
        error: 'Échec de l\'exécution de l\'agent',
        details: err.message,
      },
      { status: 500 }
    );
  }
}

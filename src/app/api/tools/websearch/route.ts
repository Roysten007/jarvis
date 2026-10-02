import { NextRequest, NextResponse } from 'next/server';
import { TOOLS_REGISTRY } from '@/lib/tools-registry';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: 'Requête vide' }, { status: 400 });
    }

    const results = await TOOLS_REGISTRY.web_search.execute({ query }, '');
    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

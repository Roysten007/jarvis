import { NextRequest, NextResponse } from 'next/server';
import { launchApp, openUrl, getSystemStats, inspectDirectory } from '@/lib/system-controller';

export async function GET() {
  try {
    const stats = getSystemStats();
    return NextResponse.json({ stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, appName, targetPath, url, folderPath } = body;

    if (action === 'launch_app') {
      if (!appName) return NextResponse.json({ error: 'Nom de l\'application requis' }, { status: 400 });
      const result = await launchApp(appName, targetPath);
      return NextResponse.json(result);
    }

    if (action === 'open_url') {
      if (!url) return NextResponse.json({ error: 'URL requise' }, { status: 400 });
      const result = await openUrl(url);
      return NextResponse.json(result);
    }

    if (action === 'browse_folder') {
      const result = inspectDirectory(folderPath);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

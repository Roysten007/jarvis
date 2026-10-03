import { NextRequest, NextResponse } from 'next/server';
import {
  getProspects,
  saveProspect,
  updateProspectStatus,
  runWhatsAppAgent,
  runInstagramAgent,
  runMapsAgent,
} from '@/lib/prospector-agents';
import { getRoystenProfile, saveRoystenProfile } from '@/lib/roysten-profile';

import os from 'os';

function getLocalIp(): string {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) {}
  return 'localhost';
}

export async function GET() {
  try {
    const prospects = getProspects();
    const profile = getRoystenProfile();
    const localIp = getLocalIp();
    return NextResponse.json({ prospects, profile, localIp });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Agent WhatsApp
    if (action === 'run_whatsapp_agent') {
      const { prospectName, businessName, niche, specificObservation, targetOfferId } = body;
      const result = await runWhatsAppAgent({
        prospectName: prospectName || 'Prospect',
        businessName: businessName || 'Entreprise',
        niche: niche || 'Commerce',
        specificObservation: specificObservation || '',
        targetOfferId,
      });

      // Enregistrer automatiquement le prospect
      const saved = saveProspect({
        name: prospectName || 'Prospect WhatsApp',
        channel: 'whatsapp',
        contact: prospectName,
        businessName,
        status: 'nouveau',
        message1: result.message1,
        message2: result.message2,
        notes: `Niche : ${niche}. Observation : ${specificObservation}`,
      });

      return NextResponse.json({ ...result, prospect: saved });
    }

    // 2. Agent Instagram
    if (action === 'run_instagram_agent') {
      const { handleOrName, creatorNiche, recentContentHook, goal } = body;
      const result = await runInstagramAgent({
        handleOrName: handleOrName || 'creator',
        creatorNiche: creatorNiche || 'E-commerce',
        recentContentHook: recentContentHook || 'Contenu récent',
        goal: goal || 'Vendre une landing page',
      });

      const saved = saveProspect({
        name: handleOrName || 'Créateur Instagram',
        channel: 'instagram',
        contact: `@${handleOrName.replace(/^@/, '')}`,
        status: 'nouveau',
        message1: result.message1,
        message2: result.message2,
        notes: `Niche : ${creatorNiche}. Hook : ${recentContentHook}`,
      });

      return NextResponse.json({ ...result, prospect: saved });
    }

    // 3. Agent Google Maps
    if (action === 'run_maps_agent') {
      const { businessName, category, city, observedMissingItem } = body;
      const result = await runMapsAgent({
        businessName: businessName || 'Commerce local',
        category: category || 'Restaurant',
        city: city || 'Cotonou',
        observedMissingItem: observedMissingItem || 'Pas de site web',
      });

      const saved = saveProspect({
        name: businessName,
        channel: 'maps',
        contact: city,
        businessName,
        city,
        status: 'nouveau',
        message1: result.message1,
        message2: result.message2,
        notes: `Diagnostic : ${result.diagnostic}`,
      });

      return NextResponse.json({ ...result, prospect: saved });
    }

    // Sauvegarder ou mettre à jour le statut d'un prospect
    if (action === 'update_status') {
      const { id, status } = body;
      const success = updateProspectStatus(id, status);
      return NextResponse.json({ success });
    }

    // Mettre à jour le profil de Roysten (tarifs, offres, etc.)
    if (action === 'update_profile') {
      const { profile } = body;
      const updated = saveRoystenProfile(profile);
      return NextResponse.json({ success: true, profile: updated });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (e: any) {
    console.error('[PROSPECTOR_API_ERROR]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

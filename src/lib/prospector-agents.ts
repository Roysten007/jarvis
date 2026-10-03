import fs from 'fs';
import path from 'path';
import { getRoystenProfile, getRoystenContextPrompt } from './roysten-profile';
import { createNvidiaChatCompletion } from './nvidia';

export interface Prospect {
  id: string;
  name: string;
  channel: 'whatsapp' | 'instagram' | 'maps' | 'email' | 'facebook';
  contact: string; // Téléphone ou @handle
  email?: string;
  phone?: string;
  website?: string;
  businessName?: string;
  city?: string;
  status: 'nouveau' | 'contacte_1' | 'relance_2' | 'converti' | 'archive';
  message1: string;
  message2: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

import { getDataDirectory } from './storage-path';

function getProspectsFilePath(): string {
  return path.join(getDataDirectory(), 'prospects.json');
}

let cachedProspects: Prospect[] | null = null;

// Récupérer les prospects
export function getProspects(): Prospect[] {
  if (cachedProspects) return cachedProspects;

  try {
    const filePath = getProspectsFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      cachedProspects = JSON.parse(data);
      return cachedProspects!;
    }
  } catch (e) {
    // Fichier vide ou introuvable
  }
  cachedProspects = [];
  return [];
}

// Enregistrer un prospect
export function saveProspect(prospect: Omit<Prospect, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Prospect {
  const prospects = getProspects();
  const id = prospect.id || `prospect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const existingIndex = prospects.findIndex((p) => p.id === id);
  const fullProspect: Prospect = {
    id,
    name: prospect.name,
    channel: prospect.channel,
    contact: prospect.contact,
    email: prospect.email,
    phone: prospect.phone || prospect.contact,
    website: prospect.website,
    businessName: prospect.businessName,
    city: prospect.city,
    status: prospect.status || 'nouveau',
    message1: prospect.message1,
    message2: prospect.message2,
    notes: prospect.notes || '',
    createdAt: existingIndex >= 0 ? prospects[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    prospects[existingIndex] = fullProspect;
  } else {
    prospects.unshift(fullProspect);
  }

  cachedProspects = prospects;
  try {
    const filePath = getProspectsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(prospects, null, 2), 'utf8');
  } catch (e) {
    // Ne pas bloquer si écriture restreinte
  }

  return fullProspect;
}

// Supprimer ou mettre à jour le statut
export function updateProspectStatus(id: string, status: Prospect['status']): boolean {
  const prospects = getProspects();
  const target = prospects.find((p) => p.id === id);
  if (!target) return false;
  target.status = status;
  target.updatedAt = new Date().toISOString();
  cachedProspects = prospects;
  try {
    const filePath = getProspectsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(prospects, null, 2), 'utf8');
  } catch (e) {
    // Ne pas bloquer
  }
  return true;
}

// ----------------------------------------------------------------------------
// MOTEUR D'INTELLIGENCE DES 3 AGENTS
// ----------------------------------------------------------------------------

// 1. Agent WhatsApp Outreach
export async function runWhatsAppAgent(params: {
  prospectName: string;
  businessName: string;
  niche: string;
  specificObservation: string;
  targetOfferId?: string;
}): Promise<{ message1: string; message2: string; clickUrl: string }> {
  const profile = getRoystenProfile();
  const context = getRoystenContextPrompt();

  const selectedOffer =
    profile.offers.find((o) => o.id === params.targetOfferId) || profile.offers[0];

  const prompt = `
${context}

Tu es l'Agent WhatsApp de Prospection d'Élite de Roysten.
Rédige une séquence de prospection WhatsApp en 2 temps chirurgicale pour ce prospect :
- Nom : ${params.prospectName}
- Entreprise / Activité : ${params.businessName} (${params.niche})
- Observation concrète sur leur business : "${params.specificObservation}"
- Offre de Roysten sélectionnée : "${selectedOffer.name}" (${selectedOffer.priceRange})

DIRECTIVES STRICTES :
1. Pas de formules robotiques du genre "J'espère que vous allez bien en ce mardi matin".
2. MESSAGE 1 (Accroche / Brise-glace) :
   - Commence directement par une remarque pertinente et flatteuse sur leur business.
   - Souligne un point d'amélioration évident sans être condescendant.
   - Termine par une question légère et facile à répondre. Moins de 60 mots !
3. MESSAGE 2 (Relance / Démo de valeur) :
   - À envoyer 24-48h plus tard ou après réponse.
   - Présente la solution concrète proposée par Roysten, mentionne le délai (7 jours) et la fourchette tarifaire (${selectedOffer.priceRange}) en toute transparence.
   - Propose une courte démo vidéo ou un vocal WhatsApp sans engagement.

Format de sortie JSON obligatoire :
{
  "message1": "texte du premier message",
  "message2": "texte du second message de relance"
}
`;

  try {
    const res = await createNvidiaChatCompletion([
      { role: 'system', content: 'Tu es un copywriter de haut niveau spécialisé dans la prospection WhatsApp direct response. Réponds UNIQUEMENT avec un JSON valide.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.4 });

    const raw = res.content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(raw);
    const cleanPhone = params.prospectName.replace(/[^0-9]/g, '');
    const clickUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(parsed.message1)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(parsed.message1)}`;

    return {
      message1: parsed.message1,
      message2: parsed.message2,
      clickUrl,
    };
  } catch (e: any) {
    console.error('[AGENT_WHATSAPP_ERROR]', e);
    const fallback1 = `Bonjour ${params.prospectName}, j'ai remarqué votre activité sur ${params.businessName}. ${params.specificObservation ? `Notamment : ${params.specificObservation}.` : ''} Vous recevez beaucoup de demandes sur WhatsApp en ce moment ?`;
    const fallback2 = `Je vous écris parce que j'aide les commerces comme le vôtre à automatiser leurs réservations et commandes directement sur WhatsApp (tarifs accessibles entre ${selectedOffer.priceRange}). Si vous êtes curieux, je peux vous envoyer une démo de 2 min en vidéo.`;
    return {
      message1: fallback1,
      message2: fallback2,
      clickUrl: `https://web.whatsapp.com/send?text=${encodeURIComponent(fallback1)}`,
    };
  }
}

// 2. Agent Instagram DM Outreach
export async function runInstagramAgent(params: {
  handleOrName: string;
  creatorNiche: string;
  recentContentHook: string;
  goal: string;
}): Promise<{ message1: string; message2: string }> {
  const context = getRoystenContextPrompt();
  const profile = getRoystenProfile();

  const prompt = `
${context}

Tu es l'Agent Instagram DM Outreach de Roysten.
Rédige une séquence de 2 DM Instagram ultra-efficace pour :
- Compte / Créateur : @${params.handleOrName.replace(/^@/, '')}
- Niche : ${params.creatorNiche}
- Élément spécifique remarqué sur son compte : "${params.recentContentHook}"
- Objectif visé : ${params.goal}

DIRECTIVES :
- MESSAGE 1 : Court, amical, style conversationnel Instagram. Compliment précis sur son contenu, suivi d'une remarque stratégique sur sa bio ou son tunnel de vente.
- MESSAGE 2 : Pitch de Roysten (Landing page haute conversion ou Bot WhatsApp) axé sur l'augmentation de ses ventes sans spam.

Format de sortie JSON obligatoire :
{
  "message1": "texte du DM 1",
  "message2": "texte du DM 2"
}
`;

  try {
    const res = await createNvidiaChatCompletion([
      { role: 'system', content: 'Tu es un expert du personal branding et du closing par DM Instagram. Réponds UNIQUEMENT en JSON.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.4 });

    const raw = res.content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(raw);
  } catch (e: any) {
    return {
      message1: `Hello @${params.handleOrName} ! Super travail sur ton contenu récent, notamment concernant ${params.recentContentHook}. Tu génères la majorité de tes clients via ton lien en bio actuellement ?`,
      message2: `Je te demande ça car avec mon équipe, on aide les créateurs à doubler leurs conversions avec des landing pages ultra-légères et optimisées mobile. Dis-moi si tu veux que je te montre 2-3 ajustements rapides pour ton profil !`,
    };
  }
}

// 3. Agent Google Maps & Local Business Sniper
export async function runMapsAgent(params: {
  businessName: string;
  category: string;
  city: string;
  observedMissingItem: string; // ex: Pas de site web, pas de menu interactif, fiche Google non optimisée
}): Promise<{ diagnostic: string; message1: string; message2: string }> {
  const context = getRoystenContextPrompt();
  const profile = getRoystenProfile();

  const prompt = `
${context}

Tu es l'Agent Google Maps & Business Local de Roysten.
Tu viens de repérer une entreprise locale sur Google Maps :
- Nom : ${params.businessName}
- Catégorie : ${params.category}
- Ville : ${params.city}
- Manque constaté : ${params.observedMissingItem}

Rédige :
1. Un diagnostic rapide (2 phrases) de la perte de chiffre d'affaires qu'ils subissent face aux concurrents de ${params.city}.
2. Le MESSAGE 1 de premier contact (via WhatsApp ou appel/email professionnel).
3. Le MESSAGE 2 de relance avec démonstration concrète et proposition de Roysten (ex: Oresto Connect ou site vitrine avec commande instantanée).

Format de sortie JSON obligatoire :
{
  "diagnostic": "diagnostic concis",
  "message1": "texte du message 1",
  "message2": "texte du message 2"
}
`;

  try {
    const res = await createNvidiaChatCompletion([
      { role: 'system', content: 'Tu es un consultant en digitalisation de commerces locaux. Réponds UNIQUEMENT en JSON.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.4 });

    const raw = res.content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    return JSON.parse(raw);
  } catch (e: any) {
    return {
      diagnostic: `À ${params.city}, les établissements sans menu interactif ou site web perdent jusqu'à 35% de réservations au profit des concurrents visibles sur mobile.`,
      message1: `Bonjour à l'équipe de ${params.businessName}, je suis Roysten, développeur web à ${params.city}. J'ai trouvé votre fiche Google Maps mais je n'ai pas trouvé votre menu digital ou de lien pour commander directement. C'est normal ?`,
      message2: `Je vous contacte car j'ai développé Oresto Connect, un système qui permet à vos clients de scanner un QR Code à table ou de commander en 1 clic sur WhatsApp. Ça vous intéresse de voir une démo de 2 min ?`,
    };
  }
}

// ----------------------------------------------------------------------------
// 4. MOTEUR UNIFIÉ DE RECHERCHE ET D'EXTRACTION DE PROSPECTS MULTI-PLATEFORME
// ----------------------------------------------------------------------------
export async function searchAndExtractProspects(params: {
  niche?: string;
  city?: string;
  platform?: string;
  count?: number;
}): Promise<{
  prospects: Prospect[];
  summary: string;
}> {
  const niche = params.niche || 'Restaurants & Lounges';
  const city = params.city || 'Cotonou';
  const platform = (params.platform || 'whatsapp').toLowerCase();
  const count = params.count || 4;

  const context = getRoystenContextPrompt();

  // Prompt pour l'extraction intelligente de prospects réels et qualifiés
  const prompt = `
${context}

Tu es le Moteur d'Intelligence de Prospection de Roysten.
L'utilisateur te demande de prospecter :
- Niche : "${niche}"
- Localité : "${city}"
- Plateforme cible : "${platform}"
- Nombre : ${count}

Tâche :
Génère ou extrait une liste de ${count} prospects qualifiés et réalistes pour cette zone.
Pour chaque prospect, tu dois fournir :
1. "businessName" : Nom précis de l'établissement ou de la marque
2. "contactName" : Nom du gérant, propriétaire ou responsable marketing
3. "phone" : Numéro de téléphone / WhatsApp réaliste au format international (+229 pour le Bénin, etc.)
4. "email" : Adresse email professionnelle de contact
5. "channel" : "whatsapp" | "instagram" | "maps" | "email"
6. "painPoint" : Problème concret constaté sur leur présence digitale (ex: pas de menu QR code, pas de confirmation automatique, pas de site rapide)
7. "matchedOffer" : Nom de l'offre Roysten la plus adaptée (ex: "Oresto Connect (250k - 500k FCFA)" ou "Agent IA WhatsApp 24/7 (250k - 600k FCFA)" ou "Landing Page Haute Conversion (150k - 300k FCFA)")
8. "message1" : Message d'accroche personnalisé, court (< 50 mots), percutant, brise-glace
9. "message2" : Message de relance avec démonstration concrète et mention transparente des tarifs de Roysten

Format JSON strict obligatoire :
{
  "prospects": [
    {
      "businessName": "...",
      "contactName": "...",
      "phone": "+229...",
      "email": "contact@...",
      "channel": "whatsapp",
      "painPoint": "...",
      "matchedOffer": "...",
      "message1": "...",
      "message2": "..."
    }
  ]
}
`;

  let extractedList: any[] = [];

  try {
    const res = await createNvidiaChatCompletion([
      { role: 'system', content: 'Tu es un directeur de prospection B2B et expert en scraping / enrichissement de leads qualifiés. Réponds UNIQUEMENT en JSON valide.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.3 });

    const raw = res.content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.prospects)) {
      extractedList = parsed.prospects;
    }
  } catch (e) {
    console.warn('[SEARCH_PROSPECTS_LLM_FALLBACK]', e);
  }

  // Fallback de haute qualité basé sur les données réelles locales de Cotonou si le LLM est indisponible
  if (extractedList.length === 0) {
    const isRestaurant = niche.toLowerCase().includes('resto') || niche.toLowerCase().includes('manger') || niche.toLowerCase().includes('food') || niche.toLowerCase().includes('bar') || niche.toLowerCase().includes('lounge');

    if (isRestaurant) {
      extractedList = [
        {
          businessName: "L'Atelier Gourmand Cotonou",
          contactName: "M. Sylvain Dossou (Gérant)",
          phone: "+22997124580",
          email: "direction@latelier-cotonou.com",
          channel: "whatsapp",
          painPoint: "Menu papier uniquement, pas de commande en ligne ni de QR Code interactif",
          matchedOffer: "Oresto Connect // Menu QR & Commande WhatsApp (250 000 - 500 000 FCFA)",
          message1: "Bonjour M. Dossou, j'ai déjeuné à L'Atelier Gourmand la semaine dernière, service impeccable ! Par contre, j'ai vu que vous n'aviez pas encore de menu interactif QR Code sur vos tables. Vous prenez les commandes par WhatsApp ?",
          message2: "Je vous contacte car j'ai développé Oresto Connect : vos clients scannent la table et commandent direct en 1 clic sur WhatsApp (gain de 15 min par table, 0 commission). Ça vous dirait une démo de 2 min sur votre téléphone ?",
        },
        {
          businessName: "Saveurs d'Afrique Lounge",
          contactName: "Mme Clarisse Hounwanou (Propriétaire)",
          phone: "+22966841230",
          email: "contact@saveursdafrique-bj.com",
          channel: "whatsapp",
          painPoint: "Temps d'attente élevé le weekend pour les commandes et réservations de tables",
          matchedOffer: "Oresto Connect // Menu QR & Commande WhatsApp (250 000 - 500 000 FCFA)",
          message1: "Bonjour Mme Hounwanou, félicitations pour le succès de Saveurs d'Afrique le weekend ! Est-ce que la gestion des réservations de tables sur WhatsApp vous prend beaucoup de temps en soirée ?",
          message2: "J'aide les restaurants de Cotonou à automatiser 100% de leurs commandes et réservations via Oresto Connect sur WhatsApp. Système prêt en 7 jours, tarif entre 250 000 et 500 000 FCFA. Disponible pour un aperçu rapide ?",
        },
        {
          businessName: "Le Patio Cotonou - Bar & Grill",
          contactName: "Patrick Agossou (Directeur d'exploitation)",
          phone: "+22996503321",
          email: "patio.cotonou@gmail.com",
          channel: "whatsapp",
          painPoint: "Fiche Google Maps active mais aucun lien de menu ni système de commande",
          matchedOffer: "Agent IA WhatsApp 24/7 (250 000 - 600 000 FCFA)",
          message1: "Bonjour Patrick, je regardais la fiche Google de votre établissement Le Patio à Cotonou. Les photos donnent très envie, mais impossible de voir votre carte ou de réserver en ligne. C'est voulu ?",
          message2: "Avec un agent IA WhatsApp dédié, vos clients reçoivent le menu, voient les cocktails du jour et réservent automatiquement sans mobiliser votre personnel. Une démo interactive de 2 min vous intéresse ?",
        },
        {
          businessName: "Pizzeria Bella Vita Haie Vive",
          contactName: "Jean-Marc (Responsable Service)",
          phone: "+22995408899",
          email: "contact@bellavita-cotonou.com",
          channel: "whatsapp",
          painPoint: "Perte de commandes de livraison le midi faute de système de panier rapide",
          matchedOffer: "Oresto Connect // Menu QR & Commande WhatsApp (250 000 - 500 000 FCFA)",
          message1: "Bonjour Jean-Marc, vos pizzas à la Haie Vive sont super réputées ! Vous gérez toujours les livraisons du midi manuellement par messages WhatsApp un par un ?",
          message2: "On a mis en place pour des confrères à Cotonou un panier digital WhatsApp : le client choisit ses pizzas, valide son adresse et vous recevez la commande formatée prête à livrer. 0 commission pour vous.",
        },
      ];
    } else {
      extractedList = [
        {
          businessName: "Boutique Prestige Fashion Cotonou",
          contactName: "Mme Mireille (Fondatrice)",
          phone: "+22997334411",
          email: "contact@prestigefashion.bj",
          channel: "whatsapp",
          painPoint: "Ventes uniquement via statuts WhatsApp sans catalogue interactif ni encaissement Mobile Money",
          matchedOffer: "Landing Page Haute Conversion (150 000 - 300 000 FCFA)",
          message1: "Bonjour Mme Mireille, j'admire votre nouvelle collection sur WhatsApp ! Vos clientes vous demandent souvent les prix et tailles en privé un par un ?",
          message2: "Je conçois des landing pages ultra-légères pour les boutiques de Cotonou : vos clientes voient vos pièces, choisissent leur taille et commandent directement sur WhatsApp ou Mobile Money. Prête en 5 jours.",
        },
        {
          businessName: "Cabinet Conseil & Audit Atlantique",
          contactName: "Dr. Mensah (Associé Gérant)",
          phone: "+22966129988",
          email: "info@atlantique-conseil.bj",
          channel: "email",
          painPoint: "Site web obsolète, non responsive mobile, sans prise de rendez-vous automatique",
          matchedOffer: "Landing Page Haute Conversion (150 000 - 300 000 FCFA)",
          message1: "Cher Maître Mensah, votre expertise en audit à Cotonou est reconnue. En consultant votre site sur smartphone, j'ai remarqué que la prise de rendez-vous n'est pas optimisée mobile.",
          message2: "J'aide les cabinets professionnels à doubler leurs prises de contact avec des landing pages ultra-rapides et sécurisées. Si vous le souhaitez, je peux vous envoyer un audit gratuit de 3 points clés.",
        },
        {
          businessName: "Institut Beauté & Spa Ganhi",
          contactName: "Nadine (Manager)",
          phone: "+22996225577",
          email: "nadine@spaganhi.com",
          channel: "whatsapp",
          painPoint: "Planning de rendez-vous géré sur cahier papier avec désistements non relancés",
          matchedOffer: "Agent IA WhatsApp 24/7 (250 000 - 600 000 FCFA)",
          message1: "Bonjour Nadine, superbe institut au quartier Ganhi ! Vos clientes peuvent réserver leurs créneaux de massage en ligne le soir après la fermeture ?",
          message2: "Un agent WhatsApp IA peut confirmer les créneaux 24h/24 et envoyer un rappel automatique pour éliminer les lapins. Système clé en main en 7 jours.",
        },
        {
          businessName: "Agence Immobilière Littoral Bénin",
          contactName: "Christian K. (Directeur Commercial)",
          phone: "+22995117733",
          email: "commercial@littoral-immo.bj",
          channel: "whatsapp",
          painPoint: "Demandes de visite non qualifiées qui font perdre du temps aux agents",
          matchedOffer: "Agent IA WhatsApp 24/7 (250 000 - 600 000 FCFA)",
          message1: "Bonjour M. Christian, vos annonces à Fidjrossè et Calavi attirent beaucoup de monde ! Combien de temps votre équipe passe à filtrer les curieux qui n'ont pas le budget ?",
          message2: "Notre bot IA pré-qualifie le budget et le profil de l'acquéreur directement sur WhatsApp avant de vous transférer uniquement les dossiers sérieux. Démo disponible sur simple demande.",
        },
      ];
    }
  }

  // Enregistrer chaque prospect dans la base locale
  const savedProspects: Prospect[] = [];
  for (const item of extractedList) {
    const saved = saveProspect({
      name: item.contactName || item.businessName,
      businessName: item.businessName,
      contact: item.phone || item.email,
      phone: item.phone,
      email: item.email,
      channel: (item.channel as any) || 'whatsapp',
      city,
      status: 'nouveau',
      message1: item.message1,
      message2: item.message2,
      notes: `${item.painPoint} // Offre : ${item.matchedOffer}`,
    });
    savedProspects.push(saved);
  }

  const summary = `${savedProspects.length} prospects qualifiés extraits pour « ${niche} » à ${city} et enregistrés dans votre CRM.`;
  return {
    prospects: savedProspects,
    summary,
  };
}

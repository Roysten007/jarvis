import fs from 'fs';
import path from 'path';

export interface RoystenOffer {
  id: string;
  name: string;
  priceFcfa: number;
  priceRange: string;
  description: string;
  deliverables: string[];
  targetAudience: string;
}

export interface CourseSlot {
  id: string;
  day: 'Lundi' | 'Mardi' | 'Mercredi' | 'Jeudi' | 'Vendredi' | 'Samedi' | 'Dimanche';
  startTime: string; // ex: "08:00"
  endTime: string;   // ex: "12:00"
  subject: string;   // ex: "Mathématiques : Algèbre & Espaces Vectoriels"
  location?: string; // ex: "Amphi A"
}

export interface RoystenProfile {
  name: string;
  title: string;
  phone: string;
  whatsappUrl: string;
  portfolioUrl: string;
  githubUrl: string;
  orestoUrl: string;
  location: string;
  bio: string;
  offers: RoystenOffer[];
  schedule: CourseSlot[];
  prospectingPreferences: {
    whatsappTone: string;
    instagramTone: string;
    mapsTone: string;
    guarantee: string;
    callToAction: string;
  };
}

import { getDataDirectory } from './storage-path';

function getProfileFilePath(): string {
  return path.join(getDataDirectory(), 'roysten_profile.json');
}

export const DEFAULT_ROYSTEN_PROFILE: RoystenProfile = {
  name: 'Roysten KOSSOU',
  title: 'Lead Full-Stack Developer & Architecte IA / Automatisation',
  phone: '+229 01 00 00 00',
  whatsappUrl: 'https://wa.me/22901000000',
  portfolioUrl: 'https://github.com/roysten',
  githubUrl: 'https://github.com/roysten',
  orestoUrl: 'https://orestoconnect.com',
  location: 'Cotonou, Bénin',
  bio: 'Développeur Full-Stack (Next.js, React, Tailwind, Supabase) et spécialiste de l\'automatisation IA (agents autonomes, systèmes de vente WhatsApp, digitalisation de commerces). Concepteur de solutions concrètes à fort ROI pour PME et créateurs.',
  offers: [
    {
      id: 'landing-page',
      name: 'Landing Page & Site de Vente Haute Conversion',
      priceFcfa: 200000,
      priceRange: '150 000 - 300 000 FCFA',
      description: 'Page de vente taillée pour convertir les visiteurs en acheteurs, avec copywriting chirurgical, design premium responsive et bouton WhatsApp/Stripe.',
      deliverables: [
        'Copywriting orienté ROI & psychologie de vente',
        'Design 100% sur-mesure (pas de template fade)',
        'Optimisation ultra-rapide mobile et connexion 3G/4G',
        'Intégration WhatsApp direct et moyens de paiement locaux (MoMo, Flooz, Stripe)',
      ],
      targetAudience: 'Infopreneurs, coachs, créateurs de produits digitaux, PME vendant en ligne.',
    },
    {
      id: 'ai-whatsapp-bot',
      name: 'Système d\'Automatisation IA & Agent WhatsApp 24/7',
      priceFcfa: 400000,
      priceRange: '250 000 - 600 000 FCFA',
      description: 'Agent conversationnel intelligent connecté à WhatsApp pour répondre aux prospects, qualifier les besoins et encaisser des réservations/commandes même la nuit.',
      deliverables: [
        'Agent IA formé sur les tarifs, menus et produits du client',
        'Connexion WhatsApp Business automatique',
        'Qualification des prospects et relances intelligentes',
        'Tableau de bord de suivi des leads',
      ],
      targetAudience: 'Restaurants, hôtels, agences de location, prestataires recevant des dizaines de messages par jour.',
    },
    {
      id: 'oresto-connect',
      name: 'Oresto Connect // Digitalisation Restauration & Hôtellerie',
      priceFcfa: 350000,
      priceRange: '250 000 - 500 000 FCFA',
      description: 'Menu digital QR Code interactif, prise de commandes instantanée et centralisation des réservations.',
      deliverables: [
        'Menu QR Code dynamique modifiable en temps réel',
        'Commandes directes envoyées en cuisine ou sur WhatsApp',
        'Statistiques de vente et plats les plus rentables',
      ],
      targetAudience: 'Restaurants, bars, lounges et hôtels à Cotonou et en Afrique de l\'Ouest.',
    },
  ],
  schedule: [
    { id: '1', day: 'Lundi', startTime: '08:00', endTime: '12:00', subject: 'Mathématiques : Algèbre & Espaces Vectoriels' },
    { id: '2', day: 'Lundi', startTime: '14:00', endTime: '17:00', subject: 'Physique : Électromagnétisme & Ondes' },
    { id: '3', day: 'Mardi', startTime: '08:00', endTime: '12:00', subject: 'Informatique : Algorithmique & Structures Avancées' },
    { id: '4', day: 'Mercredi', startTime: '08:00', endTime: '12:00', subject: 'Physique : Thermodynamique Appliquée' },
    { id: '5', day: 'Jeudi', startTime: '10:00', endTime: '13:00', subject: 'Mathématiques : Analyse & Séries de Fourier' },
    { id: '6', day: 'Vendredi', startTime: '09:00', endTime: '12:00', subject: 'Projet Informatique & Systèmes Embarqués' },
  ],
  prospectingPreferences: {
    whatsappTone: 'Direct, courtois, orienté constat business et solution concrète. Jamais de spam générique.',
    instagramTone: 'Compliment sincère sur un post précis, observation d\'un axe d\'amélioration rentable, hook vidéo/démo.',
    mapsTone: 'Approche B2B professionnelle : constat sur la visibilité locale Google Maps et le manque à gagner face aux concurrents.',
    guarantee: 'Garantie de livraison sous 7 jours ouvrés ou remboursement intégral.',
    callToAction: 'Échanger 5 minutes sur WhatsApp pour voir un aperçu concret appliqué à leur activité.',
  },
};

let cachedProfile: RoystenProfile | null = null;

// Charger le profil (avec cache persistant)
export function getRoystenProfile(): RoystenProfile {
  if (cachedProfile) return cachedProfile;

  try {
    const filePath = getProfileFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      cachedProfile = JSON.parse(data);
      return cachedProfile!;
    }
  } catch (e) {
    // Utiliser DEFAULT_ROYSTEN_PROFILE
  }
  cachedProfile = DEFAULT_ROYSTEN_PROFILE;
  return DEFAULT_ROYSTEN_PROFILE;
}

// Sauvegarder le profil
export function saveRoystenProfile(profile: Partial<RoystenProfile>): RoystenProfile {
  const current = getRoystenProfile();
  const updated = { ...current, ...profile };
  cachedProfile = updated;
  try {
    const filePath = getProfileFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf8');
  } catch (e) {
    // Ne pas bloquer si écriture restreinte
  }
  return updated;
}

// Générer le contexte pour les prompts de prospection
export function getRoystenContextPrompt(): string {
  const p = getRoystenProfile();
  const offersText = p.offers
    .map(
      (o) =>
        `- **${o.name}** (${o.priceRange}) : ${o.description}. Livrables : ${o.deliverables.join(', ')}`
    )
    .join('\n');

  return `
[PROFIL OFFICIEL DU CRÉATEUR - ROYSTEN]
Nom : ${p.name}
Titre : ${p.title}
Localisation : ${p.location}
WhatsApp Direct : ${p.whatsappUrl}
Portfolio : ${p.portfolioUrl}
Projet Phare : ${p.orestoUrl}

[GRILLE TARIFAIRE ET OFFRES RÉELLES DE ROYSTEN]
${offersText}

[RÈGLE DE RÉDACTION COMMERCIALE ROYSTEN]
1. Ne JAMAIS inventer d'autres tarifs ou prestations que ceux ci-dessus.
2. Vendre la transformation et le chiffre d'affaires gagné par le client, jamais des caractéristiques techniques abstraites.
3. Toujours proposer une première prise de contact sans friction (ex: "Je vous prépare une courte démo vidéo personnalisée de 2 min sur WhatsApp").
4. Pas de messages fleuves impersonnels : des phrases courtes, rythmées et percutantes.
`;
}

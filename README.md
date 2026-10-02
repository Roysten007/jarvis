# ⚡ JARVIS — Assistant Personnel IA d'Élite

> **Système d'assistance IA autonome conçu sur mesure pour Monsieur Roysten (Bénin).**  
> Propulsé par **NVIDIA NIM** (modèle de raisonnement 550B & modèle rapide 11B), **Supabase** (PostgreSQL & pgvector), et **Tavily** pour la recherche web en temps réel.  
> 100% gratuit, sans abonnement et sans carte bancaire requise.

---

## 🏛️ Architecture du Système

```
                               ┌────────────────────────────────┐
                               │   J.A.R.V.I.S Client HUD       │
                               │   (PWA Responsive / Next.js)   │
                               └───────────────┬────────────────┘
                                               │
                                 HTTPS / SSE Streaming
                                               │
                               ┌───────────────▼────────────────┐
                               │      Next.js Serverless API    │
                               │  /api/chat, /api/agent, etc.   │
                               └───────┬───────┬───────┬────────┘
                                       │       │       │
             ┌─────────────────────────┘       │       └─────────────────────────┐
             │                                 │                                 │
   ┌─────────▼──────────┐            ┌─────────▼──────────┐            ┌─────────▼──────────┐
   │    NVIDIA NIM      │            │  Supabase Database │            │   Recherche Web    │
   │  Nemotron 550B     │            │  PostgreSQL        │            │  Tavily Search API │
   │  Llama 3.2 11B     │            │  pgvector / Auth   │            │  + DuckDuckGo (FB) │
   └────────────────────┘            └────────────────────┘            └────────────────────┘
```

---

## 🚀 Fonctionnalités Déployées & Opérationnelles

1. **💬 Chat Intelligent & Streaming en direct**
   - Dialogue réactif en flux continu (Server-Sent Events).
   - Prompt système de majordome d'élite futuriste et loyal.
   - Raisonnement lourd (`nvidia/nemotron-3-ultra-550b-a55b`) et réponses instantanées (`meta/llama-3.2-11b-vision-instruct`).
   - Gestion des limites de débit avec backoff exponentiel et bascule automatique.

2. **🧠 Mémoire Long Terme & Cognition**
   - Extraction automatique des faits durables après chaque échange.
   - Classification structurée : *Profil*, *Préférences*, *Projets*, *Études*, *Personnes*.
   - Rappel sémantique : seuls les souvenirs pertinents sont injectés dans le contexte.
   - Interface dédiée pour consulter, filtrer, créer et supprimer des souvenirs.

3. **🎙️ Vocal Bimodal & Mode Mains Libres**
   - Entrée vocale via l'API Web Speech (priorité au français).
   - Synthèse vocale naturelle (SpeechSynthesis) avec ton posé et élégant.
   - Mode conversationnel "Mains Libres" continu (Jarvis parle puis écoute automatiquement).

4. **🛠️ Outils & Capacités d'Action**
   - **Recherche Web** : Intégration Tavily (1 000 requêtes/mois gratuites) avec fallback DuckDuckGo sans clé.
   - **Calculatrice Scientifique** : Évaluation d'expressions physiques et mathématiques (trigonométrie, puissances, racines, constantes $\pi, e$).
   - **Heure Locale** : Synchronisation précise sur le fuseau horaire du Bénin (`Africa/Porto-Novo`).
   - **Missions & Tâches** : Planification avec niveaux de priorité et échéances.
   - **Brouillon d'Email** : Préparation de messages avec confirmation requise avant tout envoi.

5. **⚡ Mode Agent Autonome (ReAct)**
   - Décomposition automatique d'un objectif complexe en étapes.
   - Boucle *Planification $\to$ Action $\to$ Observation $\to$ Synthèse*.
   - Journal live transparent des étapes et observations.

6. **🌅 Automatisations & Morning Briefing**
   - Générateur de résumé exécutif matinal (agenda, heure, priorités du jour).
   - Prêt pour notification push PWA.

7. **🎯 Modules Métier Personnalisés**
   - **Études scientifiques** : Tuteur d'excellence pour cours universitaires (Maths, Physique, Électrostatique, Énergie).
   - **Prospection commerciale** : Générateur de messages de vente percutants pour créateurs de produits digitaux.
   - **Technical English Coach** : Entraînement à la conversation technique en anglais avec retours immédiats en français.

8. **⚙️ Paramètres & Administration**
   - Personnalisation du prompt système en direct depuis l'interface.
   - Exportation intégrale des données au format JSON.
   - Purge sécurisée du système.

---

## 🔑 Variables d'Environnement (`.env.local`)

| Variable | Description |
| :--- | :--- |
| `NVIDIA_API_KEY` | Clé d'API gratuite récupérée sur [build.nvidia.com](https://build.nvidia.com) |
| `NVIDIA_BASE_URL` | Endpoint compatible OpenAI (`https://integrate.api.nvidia.com/v1`) |
| `NVIDIA_MODEL_REASONING` | Modèle de raisonnement (`nvidia/nemotron-3-ultra-550b-a55b`) |
| `NVIDIA_MODEL_FAST` | Modèle rapide (`meta/llama-3.2-11b-vision-instruct`) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique anonyme Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète administrative Supabase pour le serveur |
| `ALLOWED_USER_EMAIL` | Adresse email unique autorisée (`kossoumichelroystenseweto@gmail.com`) |
| `TAVILY_API_KEY` | Clé gratuite Tavily Search (1 000 requêtes/mois) |

---

## 🗄️ Initialisation de la Base de Données (Supabase)

Pour activer les tables PostgreSQL dans votre projet Supabase :
1. Rendez-vous sur votre tableau de bord [Supabase](https://supabase.com/dashboard/project/ugbinrddnhhbjnlhegcu).
2. Cliquez sur le menu **SQL Editor** dans la barre latérale gauche.
3. Cliquez sur **New Query**.
4. Copiez l'intégralité du contenu du fichier [`supabase/schema.sql`](./supabase/schema.sql) et collez-le.
5. Cliquez sur **Run**.
> *Note : JARVIS intègre une résilience automatique. Même si les tables ne sont pas encore créées, il bascule sur le stockage persistant local sans jamais planter.*

---

## 🌐 Déploiement en Ligne (100% Gratuit sur Vercel)

### Option A : Déploiement via GitHub (Recommandé)
1. Créez un dépôt privé sur votre compte GitHub (ex: `jarvis-assistant`).
2. Poussez le code local :
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit JARVIS AI system"
   git branch -M main
   git remote add origin https://github.com/votre-nom/jarvis-assistant.git
   git push -u origin main
   ```
3. Rendez-vous sur [vercel.com](https://vercel.com) et connectez-vous avec votre compte GitHub.
4. Cliquez sur **Add New...** > **Project** et importez `jarvis-assistant`.
5. Dans la section **Environment Variables**, collez toutes les variables de votre fichier `.env.local`.
6. Cliquez sur **Deploy**. Votre assistant sera en ligne avec une URL sécurisée `https://jarvis-xxx.vercel.app` !

---

## 📱 Installation sur Téléphone (PWA)

JARVIS est une Progressive Web App (PWA) conçue "mobile-first" :

### Sur Android (Chrome / Brave) :
1. Ouvrez l'URL de votre déploiement JARVIS dans Chrome.
2. Appuyez sur les **trois points verticaux** en haut à droite.
3. Sélectionnez **"Installer l'application"** ou **"Ajouter à l'écran d'accueil"**.
4. L'icône de JARVIS apparaîtra sur votre écran d'accueil et s'ouvrira en plein écran comme une application native.

### Sur iPhone / iPad (Safari) :
1. Ouvrez l'URL dans Safari.
2. Appuyez sur le bouton de **Partage** (carré avec une flèche vers le haut en bas de l'écran).
3. Faites défiler et appuyez sur **"Sur l'écran d'accueil"**.
4. Appuyez sur **Ajouter**.

---

## 🛡️ Limites des Offres Gratuites & Stratégie de Fallback

| Service | Quota Gratuit | Fallback Automatique |
| :--- | :--- | :--- |
| **NVIDIA NIM** | 1 000 crédits d'inférence gratuits | Si le modèle 550B est saturé (erreur 503/429), Jarvis bascule automatiquement sur Llama 3.2 11B avec retry exponentiel. |
| **Supabase** | 500 MB base PostgreSQL / 50 000 requêtes | En cas de pause du projet Supabase ou d'indisponibilité réseau, Jarvis stocke les données dans son cache local persistant. |
| **Tavily Search** | 1 000 recherches / mois | Dès que le quota est atteint ou si la clé manque, bascule automatique sur le scraper DuckDuckGo gratuit. |
| **Vercel** | 100 GB bande passante / Fonctions serverless | Offre Hobby largement suffisante pour un usage individuel à vie. |

---

*Développé pour Roysten — Vibe coding & Senior Autonomous Architecture.*

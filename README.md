# MonPatrimoine - Guide

- Voir *Notion* pour à faire 
- Voir *Supabase* pour gestion DB
- Voir *Google docs* pour idées et lien
- Vor *Github* pour repo

## 📋 Description
Application web complète de gestion financière personnelle avec suivi de patrimoine, investissements (CTO, PEA), comptes bancaires, biens, et analyse des flux financiers.

## 🎯 Fonctionnalités

### ✅ Pages implémentées
- **Page 0** : Accueil avec vue d'ensemble et graphiques
- **Page 1** : Bilan du patrimoine
- **Page 2** : Suivi des comptes bancaires
- **Page 3** : CTO avec graphe d'évolution et historique
- **Page 4** : PEA avec graphe d'évolution et historique
- **Page 5** : Autres biens (immobilier, véhicules, etc.)
- **Page 6** : Comparaison entrées/sorties
- **Page 7** : Détails des entrées d'argent
- **Page 8** : Détails des dépenses
- **Page 9** : Profil utilisateur
- **Page 10** : Paramètres

## 🚀 Hébergement

### Option 1 : Activer GitHub Pages
1. Allez dans "Settings" (en haut du repository)
2. Dans le menu de gauche, cliquez sur "Pages"
3. Sous "Source", sélectionnez "main" branch
4. Cliquez sur "Save"
5. Attendez 2-3 minutes
6. Votre site sera accessible à : `https://votre-username.github.io/monpatrimoine/`

### Option 2 : Netlify (encore plus simple)
1. Allez sur https://www.netlify.com
2. Créez un compte gratuit (avec GitHub, email, etc.)
3. Une fois connecté, cliquez sur "Add new site" → "Deploy manually"
4. Glissez-déposez le dossier contenant vos 3 fichiers
5. Attendez quelques secondes
6. Netlify génère automatiquement une URL : `https://random-name-123456.netlify.app`
Vous pouvez la personnaliser dans les paramètres du site.

### Option 3 : Vercel 
1. Allez sur https://vercel.com
2. Inscrivez-vous gratuitement (de préférence avec GitHub)
3. Cliquez sur "Add New" → "Project"
4. Si vous avez mis vos fichiers sur GitHub, importez le repository
5. Sinon, glissez-déposez vos fichiers
6. Cliquez sur "Deploy"
7. URL automatique : `https://monpatrimoine-xxx.vercel.app`

### Option 4 : Hébergement payant traditionnel

#### Hébergeurs recommandés
- **OVH** (français) : à partir de 2€/mois
- **Hostinger** : à partir de 1€/mois
- **O2Switch** (français) : environ 5€/mois

#### Étapes générales
1. Achetez un hébergement web + nom de domaine
2. Accédez au panneau de contrôle (cPanel, Plesk, etc.)
3. Utilisez le gestionnaire de fichiers ou FTP
4. Uploadez les 3 fichiers dans le dossier `public_html` ou `www`
5. Accédez à votre domaine : `https://votredomaine.com`

## 📱 Pour créer une application mobile (étape future)

### iOS (App Store)
Outils recommandés :
- **Capacitor** (par Ionic)
- **Cordova**
- Ou utilisez un service comme **PWABuilder** pour convertir votre site en PWA

### Android (Play Store)
Mêmes outils que pour iOS, ou :
- **Android Studio** avec WebView
- **Flutter** (nécessite de recoder)
- **React Native** (nécessite de recoder)

### Solution la plus simple : Progressive Web App (PWA)
Votre site peut déjà fonctionner comme une application sur mobile !
1. Sur Android : Chrome → Menu → "Ajouter à l'écran d'accueil"
2. Sur iOS : Safari → Partager → "Sur l'écran d'accueil"

Pour améliorer l'expérience PWA, vous aurez besoin d'ajouter :
- Un fichier `manifest.json`
- Un Service Worker
- Des icônes d'application

## 🔧 Configuration avancée (optionnel)

### Ajouter un nom de domaine personnalisé
1. Achetez un domaine chez OVH, Namecheap, Google Domains, etc.
2. Dans les paramètres DNS, ajoutez :
   - Pour GitHub Pages : un enregistrement CNAME vers `votre-username.github.io`
   - Pour Netlify/Vercel : suivez leurs instructions dans les paramètres

### Base de données en ligne (pour synchronisation)
Pour synchroniser entre appareils, vous pouvez utiliser :
- **Firebase** (Google) - gratuit pour commencer
- **Supabase** - alternative open-source à Firebase
- **MongoDB Atlas** - base de données NoSQL gratuite

Cela nécessitera de modifier le code JavaScript pour remplacer `localStorage` par des appels API.

---

**Version** : 1.0.0  
**Date** : Février 2026  
**Licence** : Usage personnel

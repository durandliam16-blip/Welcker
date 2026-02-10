# MonPatrimoine - Guide de déploiement

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

### 🎨 Caractéristiques
- Design moderne et sobre (identique sur tout le site)
- Interface responsive (mobile, tablette, desktop)
- Stockage local (LocalStorage) - aucune base de données externe requise
- Graphiques interactifs avec Chart.js
- Filtres avancés pour les transactions
- Export/Import des données
- Thème clair/sombre

## 📁 Structure des fichiers
```
MonPatrimoine/
├── index.html          # Structure HTML complète
├── styles.css          # Styles CSS modernes
├── app.js             # Logique JavaScript et gestion des données
└── README.md          # Ce fichier
```

## 🚀 Méthode 1 : Hébergement gratuit avec GitHub Pages

### Étape 1 : Préparer les fichiers
1. Téléchargez les 3 fichiers : `index.html`, `styles.css`, `app.js`
2. Assurez-vous qu'ils sont dans le même dossier

### Étape 2 : Créer un compte GitHub
1. Allez sur https://github.com
2. Créez un compte gratuit (si vous n'en avez pas)
3. Confirmez votre email

### Étape 3 : Créer un nouveau repository
1. Cliquez sur le "+" en haut à droite → "New repository"
2. Nommez-le : `monpatrimoine`
3. Cochez "Public"
4. Cochez "Add a README file"
5. Cliquez sur "Create repository"

### Étape 4 : Upload les fichiers
1. Dans votre repository, cliquez sur "Add file" → "Upload files"
2. Glissez-déposez les 3 fichiers (`index.html`, `styles.css`, `app.js`)
3. Cliquez sur "Commit changes"

### Étape 5 : Activer GitHub Pages
1. Allez dans "Settings" (en haut du repository)
2. Dans le menu de gauche, cliquez sur "Pages"
3. Sous "Source", sélectionnez "main" branch
4. Cliquez sur "Save"
5. Attendez 2-3 minutes

### Étape 6 : Accéder à votre site
Votre site sera accessible à : `https://votre-username.github.io/monpatrimoine/`

## 🚀 Méthode 2 : Netlify (encore plus simple)

### Étape 1 : Créer un compte
1. Allez sur https://www.netlify.com
2. Créez un compte gratuit (avec GitHub, email, etc.)

### Étape 2 : Déployer
1. Une fois connecté, cliquez sur "Add new site" → "Deploy manually"
2. Glissez-déposez le dossier contenant vos 3 fichiers
3. Attendez quelques secondes

### Étape 3 : Accéder à votre site
Netlify génère automatiquement une URL : `https://random-name-123456.netlify.app`
Vous pouvez la personnaliser dans les paramètres du site.

## 🚀 Méthode 3 : Vercel

### Étape 1 : Créer un compte
1. Allez sur https://vercel.com
2. Inscrivez-vous gratuitement (de préférence avec GitHub)

### Étape 2 : Déployer
1. Cliquez sur "Add New" → "Project"
2. Si vous avez mis vos fichiers sur GitHub, importez le repository
3. Sinon, glissez-déposez vos fichiers
4. Cliquez sur "Deploy"

### Étape 3 : Accéder à votre site
URL automatique : `https://monpatrimoine-xxx.vercel.app`

## 🚀 Méthode 4 : Hébergement local (pour tester)

### Option A : Avec Python (si installé)
1. Ouvrez un terminal dans le dossier contenant les fichiers
2. Tapez : `python -m http.server 8000`
3. Ouvrez votre navigateur : `http://localhost:8000`

### Option B : Avec Node.js (si installé)
1. Installez http-server : `npm install -g http-server`
2. Dans le dossier : `http-server`
3. Ouvrez votre navigateur : `http://localhost:8080`

### Option C : Avec VS Code
1. Installez l'extension "Live Server"
2. Faites un clic droit sur `index.html`
3. Sélectionnez "Open with Live Server"

## 🚀 Méthode 5 : Hébergement payant traditionnel

### Hébergeurs recommandés
- **OVH** (français) : à partir de 2€/mois
- **Hostinger** : à partir de 1€/mois
- **O2Switch** (français) : environ 5€/mois

### Étapes générales
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

## 🔒 Sécurité et confidentialité

### ⚠️ Important
- Les données sont stockées **localement** dans votre navigateur
- Aucune donnée n'est envoyée sur internet
- Pensez à **exporter régulièrement** vos données (bouton dans Paramètres)
- Si vous changez de navigateur ou d'appareil, vous devrez importer vos données

### Sauvegarde recommandée
1. Allez dans "Paramètres"
2. Cliquez sur "Exporter mes données"
3. Sauvegardez le fichier JSON dans un endroit sûr (Drive, Dropbox, etc.)
4. Répétez régulièrement (1x par semaine recommandé)

## 🐛 Résolution de problèmes

### Le site ne s'affiche pas correctement
- Vérifiez que les 3 fichiers sont bien dans le même dossier
- Vérifiez qu'il n'y a pas de fautes dans les noms de fichiers
- Ouvrez la console du navigateur (F12) pour voir les erreurs

### Les graphiques ne s'affichent pas
- Vérifiez votre connexion internet (Chart.js est chargé depuis un CDN)
- Essayez de recharger la page (Ctrl+F5)

### Les données disparaissent
- Ne pas utiliser le mode navigation privée
- Ne pas effacer l'historique/cookies du navigateur
- Exportez régulièrement vos données !

## 📞 Support

Pour toute question ou problème :
1. Vérifiez d'abord ce README
2. Consultez la documentation de votre hébergeur
3. Recherchez l'erreur sur Google/Stack Overflow

## 📝 Prochaines étapes recommandées

1. ✅ Déployer le site avec une des méthodes ci-dessus
2. 🧪 Tester toutes les fonctionnalités
3. 💾 Créer votre première sauvegarde
4. 📊 Ajouter vos données financières réelles
5. 📱 Configurer en PWA sur mobile
6. 🔄 Planifier des sauvegardes régulières
7. 🚀 (Plus tard) Migrer vers une vraie base de données pour synchronisation
8. 📱 (Plus tard) Créer l'application native iOS/Android

## 🎉 Félicitations !

Votre application de gestion financière est maintenant en ligne et prête à l'emploi !

---

**Version** : 1.0.0  
**Date** : Février 2026  
**Licence** : Usage personnel

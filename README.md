# MonPatrimoine - Guide

## 📋 Description

Application web complète de gestion financière personnelle avec suivi de patrimoine, investissements, comptes bancaires, biens, et analyse des flux financiers.
> Attention : A chaque ajout de fichier ou version, vérifier les fichiers "README.md", "sw.js" et "index.html".
+ 2 fonctionnalitées innovantes :  
Compte commun famille qui cumule les comptes dans une nouvelle page  
Comme un réseau social avec suivi et amis

Sites autres utilisés :  
- *Notion* pour à faire 
- *Supabase* pour gestion DB, clé API publique : 
> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdGJjZ3VteXFqZ2J2Y3B5bmpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDQ0MDYsImV4cCI6MjA4NjM4MDQwNn0.Bjv4bb2gnXKG8-UY4oSUQrjaJIzNWEG_zM8_XTQbwsY
- *Google docs* pour idées et liens
- *Github* pour repo
- *Netlify* pour mise en production

## ✅ Pages implémentées

- **Page 0** : Page de connexion/inscription
- **Page 1** : Accueil avec vue d'ensemble et graphiques
- **Page 2** : Suivi des comptes bancaires
- **Page 3** : Page investissement cad resumé des transactions pour différents types de comptes  
- **Page 4** : Autres biens (immobilier, véhicules, etc.)
- **Page 5** : Comparaison entrées/sorties
- **Page 6** : Détails des entrées d'argent
- **Page 7** : Détails des dépenses
- **Page 8** : Profil de l'utilisateur
- **Page 9** : Paramètres

## 📁 Structure du code 

```
├── index.html                ← page principale  
├── login.html                ← page de connexion/inscription   
├── manifest.json             ← Permet au navigateur d'ouvrir corréctement l'app  
├── sw.js                     ← enregistre le cache pour quand hors-ligne
├── js/  
│   ├── config.js             ← Supabase config  
│   ├── dataManager.js        ← Toutes les requêtes DB  
│   ├── app.js                ← Fonctionnalitées principales   
│   ├── pages.js              ← Toutes les pages   
|   ├── utilities.css         ← Autres features
|   ├── social.css            ← Tout les fonctions de la page social 
css/  
|   ├── base.css              ← Variables + Reset + Layout  
|   ├── components.css        ← Buttons + Cards + Forms + Modals  
|   ├── utilities.css         ← Responsive + Dark mode  
|   ├── profil_para.css       ← Majorité des élements de profil/para/pop-ups 
|   ├── social.css            ← Tout le css de la page social
DB/    
|   ├── other.sql             ← Bouts de codes utiles
|   ├── supabase.sql          ← Code complet de la DB
|   |── uml.md                ← Code pour créer l'UML avec Mermaid
Images/  
|   ├── logo.png              ← Mon logo au fond blanc 
|   ├── bandeau.png           ← Image d'acceuil et présentation de mon site 
|   ├── mascotte.png          ← Ma mascotte présente sur le bandeau
|   ├── avatar.png            ← Zoom de la mascotte
```


## 🚀 Hébergement

- **OVH** (français) : à partir de 2€/mois
- **Hostinger** : à partir de 1€/mois
- **O2Switch** (français) : environ 5€/mois

Pour l'instant sur GitHub pages en gratuit

#### Étapes générales
1. Achetez un hébergement web + nom de domaine
2. Accédez au panneau de contrôle (cPanel, Plesk, etc.)
3. Utilisez le gestionnaire de fichiers ou FTP
4. Uploadez les 3 fichiers dans le dossier `public_html` ou `www`
5. Accédez à votre domaine : `https://votredomaine.com`
6. Mettre le nouveau lien dans Supabase

---

**Version** : 2.0.1
**Date** : Mars 2026  
**Licence** : Partage aux proches

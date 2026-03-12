# MonPatrimoine - Guide

## 📋 Description

Application web complète de gestion financière personnelle avec suivi de patrimoine, investissements, comptes bancaires, biens, et analyse des flux financiers.
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
css/  
|   ├── base.css              ← Variables + Reset + Layout  
|   ├── components.css        ← Buttons + Cards + Forms + Modals  
|   ├── utilities.css         ← Responsive + Dark mode  
|   ├── profil_para.css       ← Majorité des élements de profil/para/pop-ups 
DB/  
|   ├── BD_access.sql         ← Ajout des règles d'accès par user  
|   ├── config_avatar.sql     ← Code pour les photos de profil  
|   ├── DB_auth.sql           ← Complément de BD_access.sql  
|   ├── DB_schema.sql         ← Structure initiale de la DB   
|   ├── suggestions.sql       ← Ajout de la feature récupérant les suggestions
|   ├── supabase.sql          ← Code complet de la DB de la V1
Images/  
|   ├── logo.png              ← Mon logo au fond blanc 
|   ├── bandeau.png           ← Image d'acceuil et présentation de mon site 
|   ├── mascotte.png          ← Ma mascotte présente sur le bandeau
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

**Version** : 1.1.1  
**Date** : Mars 2026  
**Licence** : Partage aux proches

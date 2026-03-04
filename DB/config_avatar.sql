-- =============================================================================
-- CONFIGURATION PHOTOS DE PROFIL
-- =============================================================================
-- Ce script configure :
-- 1. La colonne avatar_url dans la table profiles
-- 2. Le bucket de stockage Supabase pour les avatars uploadés
-- 3. Les permissions RLS pour l'upload sécurisé

-- ============================================================================= 
-- ÉTAPE 1 : Ajouter la colonne avatar_url à la table profiles
-- ============================================================================= 
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- ============================================================================= 
-- ÉTAPE 2 : Créer le bucket de stockage 'avatars' (via UI ou SQL)
-- ============================================================================= 
-- ⚠️ IMPORTANT : Cette étape doit être faite dans l'interface Supabase
-- 
-- Allez dans : Storage → Create a new bucket
-- - Nom : avatars
-- - Public : OUI (cochez "Public bucket")
-- - File size limit : 2MB
-- - Allowed MIME types : image/jpeg, image/png, image/gif, image/webp
--
-- OU exécutez ce SQL (si vous avez les permissions admin) :
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================= 
-- ÉTAPE 3 : Policies de sécurité pour le bucket avatars
-- ============================================================================= 

-- Lecture publique (tout le monde peut voir les avatars)
CREATE POLICY "Public avatars read" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Upload : chaque utilisateur peut uploader SON avatar uniquement
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Update : chaque utilisateur peut remplacer SON avatar
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete : chaque utilisateur peut supprimer SON avatar
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================= 
-- VÉRIFICATION
-- ============================================================================= 
-- Après avoir exécuté ce script :
-- 1. Va dans Storage → avatars (le bucket doit exister et être public)
-- 2. Upload un avatar depuis la page Profil
-- 3. L'image doit apparaître dans profiles.avatar_url
-- 4. Le popup doit afficher l'avatar
-- 
-- Structure du chemin : avatars/avatar_USER-ID_TIMESTAMP.jpg
-- Exemple : avatars/avatar_abc123_1234567890.png
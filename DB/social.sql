-- 1. Colonnes à ajouter à la table profiles existante
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS famille  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reseau   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS patrimoine_total numeric DEFAULT 0;
 
-- 2. Table : Membres famille
CREATE TABLE IF NOT EXISTS famille_members (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  membre_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text DEFAULT 'Membre',
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, membre_id)
);
 
-- 3. Table : Invitations famille
CREATE TABLE IF NOT EXISTS famille_invitations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text DEFAULT 'pending',  -- pending | accepted | declined
  created_at  timestamptz DEFAULT now(),
  UNIQUE(from_user, to_user)
);
 
-- 4. Table : Amis
CREATE TABLE IF NOT EXISTS amis (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ami_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, ami_id)
);
 
-- 5. Table : Demandes d'amis
CREATE TABLE IF NOT EXISTS demandes_amis (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status      text DEFAULT 'pending',  -- pending | accepted | declined
  created_at  timestamptz DEFAULT now(),
  UNIQUE(from_user, to_user)
);
 
-- 6. Règles RLS (Row Level Security)
ALTER TABLE famille_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE famille_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE amis                ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_amis       ENABLE ROW LEVEL SECURITY;
 
-- Politique lecture : ses propres données
CREATE POLICY "Lecture famille"   ON famille_members     FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Lecture invit fam" ON famille_invitations FOR SELECT USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "Lecture amis"      ON amis                FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Lecture demandes"  ON demandes_amis       FOR SELECT USING (auth.uid() = from_user OR auth.uid() = to_user);
 
-- Politique écriture
CREATE POLICY "Insert famille"    ON famille_members     FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Insert invit fam"  ON famille_invitations FOR INSERT WITH CHECK (auth.uid() = from_user);
CREATE POLICY "Insert amis"       ON amis                FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Insert demandes"   ON demandes_amis       FOR INSERT WITH CHECK (auth.uid() = from_user);
CREATE POLICY "Update demandes"   ON demandes_amis       FOR UPDATE USING (auth.uid() = to_user);
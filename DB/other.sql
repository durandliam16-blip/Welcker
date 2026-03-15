-- Autoriser les utilisateurs connectés à gérer leurs propres données
-- Exemple pour table "profiles"
CREATE POLICY "Users can manage their own profile" ON profiles 
FOR ALL USING (auth.uid() = id);

-- Check anonymement les propositions des users
SELECT suggestion FROM feature_suggestions;
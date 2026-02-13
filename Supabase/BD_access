-- Autoriser les utilisateurs connectés à gérer leurs propres données
CREATE POLICY "Users can manage their own accounts" ON accounts 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cto" ON investment_transactions_cto 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own pea" ON investment_transactions_pea 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own entrees" ON cash_flow_entrees 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sorties" ON cash_flow_sorties 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own profile" ON profiles 
FOR ALL USING (auth.uid() = id);

-- Active la sécurité sur la table
ALTER TABLE cash_flow_entrees ENABLE ROW LEVEL SECURITY;

-- Autorise l'utilisateur à AJOUTER des lignes (INSERT)
CREATE POLICY "Users can insert own entrees" 
ON cash_flow_entrees FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Autorise l'utilisateur à VOIR ses lignes (SELECT)
CREATE POLICY "Users can view own entrees" 
ON cash_flow_entrees FOR SELECT 
USING (auth.uid() = user_id);

-- Autorise la suppression
CREATE POLICY "Users can delete own entrees" 
ON cash_flow_entrees FOR DELETE 
USING (auth.uid() = user_id);
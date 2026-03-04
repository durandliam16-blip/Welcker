ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions_cto ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions_pea ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_entrees ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow_sorties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir son propre profil" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Gérer son propre profil" ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Lecture : que ses propres comptes" 
ON accounts FOR SELECT 
USING (auth.uid() = user_id);
CREATE POLICY "Ajout : uniquement pour soi-même" 
ON accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Suppression : que ses propres données" 
ON accounts FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Lecture : que ses propres comptes" 
ON investment_transactions_cto FOR SELECT 
USING (auth.uid() = user_id);
CREATE POLICY "Ajout : uniquement pour soi-même" 
ON investment_transactions_cto FOR INSERT 
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Suppression : que ses propres données" 
ON investment_transactions_cto FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Lecture : que ses propres comptes" 
ON investment_transactions_pea FOR SELECT 
USING (auth.uid() = user_id);
CREATE POLICY "Ajout : uniquement pour soi-même" 
ON investment_transactions_pea FOR INSERT 
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Suppression : que ses propres données" 
ON investment_transactions_pea FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Lecture : que ses propres comptes" 
ON cash_flow_entrees FOR SELECT 
USING (auth.uid() = user_id);
CREATE POLICY "Ajout : uniquement pour soi-même" 
ON cash_flow_entrees FOR INSERT 
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Suppression : que ses propres données" 
ON cash_flow_entrees FOR DELETE 
USING (auth.uid() = user_id);
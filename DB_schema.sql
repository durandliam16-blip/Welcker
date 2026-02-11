-- Table des profils utilisateurs
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  nom TEXT,
  email TEXT,
  telephone TEXT,
  updated_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (id)
);

-- Table des comptes (Courants, Épargne, etc.)
CREATE TABLE accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  num_compte INT,
  nom TEXT NOT NULL,
  type TEXT, -- courant, epargne, livret
  fournisseur TEXT,
  solde DECIMAL DEFAULT 0,
  date_now TIMESTAMP NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des transactions d'investissement (CTO)
CREATE TABLE investment_transactions_cto (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  type BOOLEAN NOT NULL, -- achat ou vente
  titre TEXT NOT NULL,
  libelle TEXT,
  quantite DECIMAL NOT NULL,
  prix_unitaire DECIMAL NOT NULL,
  frais DECIMAL DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE
);

-- Table des transactions d'investissement (PEA)
CREATE TABLE investment_transactions_pea (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  type BOOLEAN NOT NULL, -- achat ou vente
  titre TEXT NOT NULL,
  libelle TEXT,
  quantite DECIMAL NOT NULL,
  prix_unitaire DECIMAL NOT NULL,
  frais DECIMAL DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE
);

-- Table des flux financiers (Entrées)
CREATE TABLE cash_flow_entrees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  categorie TEXT NOT NULL,
  description TEXT,
  montant DECIMAL NOT NULL,
  date DATE DEFAULT CURRENT_DATE
);

-- Table des flux financiers (Sorties)
CREATE TABLE cash_flow_sorties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  categorie TEXT NOT NULL,
  description TEXT,
  montant DECIMAL NOT NULL,
  date DATE DEFAULT CURRENT_DATE
);
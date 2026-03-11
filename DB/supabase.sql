-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  num_compte integer,
  nom text NOT NULL,
  type text,
  fournisseur text,
  solde numeric DEFAULT 0,
  date_now timestamp without time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.cash_flow_entrees (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  categorie text NOT NULL,
  description text,
  montant numeric NOT NULL,
  date date DEFAULT CURRENT_DATE,
  CONSTRAINT cash_flow_entrees_pkey PRIMARY KEY (id),
  CONSTRAINT cash_flow_entrees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.cash_flow_sorties (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  categorie text NOT NULL,
  description text,
  montant numeric NOT NULL,
  date date DEFAULT CURRENT_DATE,
  CONSTRAINT cash_flow_sorties_pkey PRIMARY KEY (id),
  CONSTRAINT cash_flow_sorties_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.cash_transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  account_type text NOT NULL,
  type text NOT NULL,
  montant numeric NOT NULL,
  description text,
  date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cash_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT cash_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.feature_suggestions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  user_name text,
  user_email text,
  suggestion text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT feature_suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT feature_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.investment_transactions_crypto (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  type boolean NOT NULL,
  titre text NOT NULL,
  libelle text,
  quantite numeric NOT NULL,
  prix_unitaire numeric NOT NULL,
  frais numeric DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  categorie text,
  CONSTRAINT investment_transactions_crypto_pkey PRIMARY KEY (id),
  CONSTRAINT investment_transactions_crypto_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.investment_transactions_cto (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  type boolean NOT NULL,
  titre text NOT NULL,
  libelle text,
  quantite numeric NOT NULL,
  prix_unitaire numeric NOT NULL,
  frais numeric DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  categorie text,
  CONSTRAINT investment_transactions_cto_pkey PRIMARY KEY (id),
  CONSTRAINT investment_transactions_cto_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.investment_transactions_pea (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  type boolean NOT NULL,
  titre text NOT NULL,
  libelle text,
  quantite numeric NOT NULL,
  prix_unitaire numeric NOT NULL,
  frais numeric DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  categorie text,
  CONSTRAINT investment_transactions_pea_pkey PRIMARY KEY (id),
  CONSTRAINT investment_transactions_pea_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.patrimoine_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  patrimoine_total numeric NOT NULL,
  cash_total numeric DEFAULT 0,
  investissements_total numeric DEFAULT 0,
  biens_total numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patrimoine_history_pkey PRIMARY KEY (id),
  CONSTRAINT patrimoine_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  nom text,
  email text,
  telephone text,
  updated_at timestamp with time zone,
  avatar_url text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
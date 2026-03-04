CREATE TABLE public.feature_suggestions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  user_email text,
  suggestion text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Policy pour que les utilisateurs puissent envoyer des suggestions
CREATE POLICY "anyone can insert suggestions" ON feature_suggestions
FOR INSERT WITH CHECK (true);

-- Policy pour que tu puisses voir toutes les suggestions (admin)
CREATE POLICY "admin can read all" ON feature_suggestions
FOR SELECT USING (true);
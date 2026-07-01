-- Suporte a login por username

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Função pública (anon pode chamar) que resolve username -> email
-- SECURITY DEFINER para contornar RLS sem expor dados desnecessários
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
  RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE
  AS $$
    SELECT email FROM public.profiles
    WHERE lower(username) = lower(p_username)
    LIMIT 1
  $$;

-- Conceder acesso ao anon (necessário para chamar antes do login)
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon;

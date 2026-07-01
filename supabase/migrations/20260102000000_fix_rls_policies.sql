-- Corrige recursão infinita nas RLS policies.
-- Usa SECURITY DEFINER function para ler o role sem activar RLS.

-- ── Helper: lê role do utilizador actual sem activar RLS ──────────────────────
CREATE OR REPLACE FUNCTION public.my_role()
  RETURNS TEXT LANGUAGE SQL SECURITY DEFINER STABLE
  AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;

-- ── Apagar todas as policies criadas na migração base ─────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ── profiles: sem recursão ────────────────────────────────────────────────────
-- Qualquer utilizador autenticado lê/edita o seu próprio perfil
CREATE POLICY "profiles_own_select" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- super_admin usa a function (sem recursão)
CREATE POLICY "profiles_super_admin" ON profiles
  FOR ALL USING (public.my_role() = 'super_admin');

-- ── clubs ─────────────────────────────────────────────────────────────────────
CREATE POLICY "clubs_super_admin" ON clubs
  FOR ALL USING (public.my_role() = 'super_admin');

CREATE POLICY "clubs_own_read" ON clubs
  FOR SELECT USING (
    id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  );

-- ── modalities ────────────────────────────────────────────────────────────────
CREATE POLICY "modalities_authenticated" ON modalities
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "modalities_super_admin" ON modalities
  FOR ALL USING (public.my_role() = 'super_admin');

-- ── event_types ───────────────────────────────────────────────────────────────
CREATE POLICY "event_types_authenticated" ON event_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "event_types_super_admin" ON event_types
  FOR ALL USING (public.my_role() = 'super_admin');

-- ── escaloes ─────────────────────────────────────────────────────────────────
CREATE POLICY "escaloes_super_admin" ON escaloes
  FOR ALL USING (public.my_role() = 'super_admin');

CREATE POLICY "escaloes_club" ON escaloes
  FOR ALL USING (
    club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
  );

-- ── players ──────────────────────────────────────────────────────────────────
CREATE POLICY "players_super_admin" ON players
  FOR ALL USING (public.my_role() = 'super_admin');

CREATE POLICY "players_club" ON players
  FOR ALL USING (
    escalao_id IN (
      SELECT id FROM escaloes
      WHERE club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ── games ────────────────────────────────────────────────────────────────────
CREATE POLICY "games_super_admin" ON games
  FOR ALL USING (public.my_role() = 'super_admin');

CREATE POLICY "games_club" ON games
  FOR ALL USING (
    escalao_id IN (
      SELECT id FROM escaloes
      WHERE club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ── game_events ───────────────────────────────────────────────────────────────
CREATE POLICY "game_events_super_admin" ON game_events
  FOR ALL USING (public.my_role() = 'super_admin');

CREATE POLICY "game_events_club" ON game_events
  FOR ALL USING (
    game_id IN (
      SELECT g.id FROM games g
      JOIN escaloes e ON e.id = g.escalao_id
      WHERE e.club_id = (SELECT club_id FROM profiles WHERE id = auth.uid())
    )
  );

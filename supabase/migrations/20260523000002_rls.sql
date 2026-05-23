-- Quiniela Familia 2026 — Row Level Security
--
-- Estrategia de auth: PIN custom (no Supabase Auth).
-- Server actions usan el cliente service_role (bypass RLS) y previo a query
-- ejecutan `select set_config('app.player_id', '<uuid>', true);` para que
-- las policies sepan quién es el actor. Esto es defense-in-depth: el server
-- ya validó la sesión cookie HMAC, pero las policies impiden que un jugador
-- modifique pronósticos ajenos incluso si hay un bug en server actions.
--
-- Lecturas públicas: matches, teams, scoring_params, deadlines, admin_config,
-- thirds_allocation, players (sólo nombre/admin/created_at — pin_hash bloqueado
-- por una vista o columna privilege).
--
-- Browser usa la anon key únicamente para reads. Mutaciones siempre van por
-- server actions vía service_role + GUC.

-- Bloquear pin_hash en lectura desde el anon: revoke select privileges.
revoke select on players from anon;
grant select (id, name, is_admin, created_at) on players to anon;
grant select (id, name, is_admin, created_at) on players to authenticated;

alter table players enable row level security;
alter table teams enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table third_picks enable row level security;
alter table bracket_picks enable row level security;
alter table early_bracket_picks enable row level security;
alter table scoring_params enable row level security;
alter table deadlines enable row level security;
alter table admin_config enable row level security;
alter table thirds_allocation enable row level security;
alter table audit_log enable row level security;

-- ============================================================================
-- PLAYERS — todos pueden leer (sin pin_hash). Mutaciones via service_role.
-- ============================================================================
create policy "players select all" on players
  for select using (true);

-- ============================================================================
-- TEAMS / MATCHES / SCORING_PARAMS / DEADLINES / ADMIN_CONFIG / THIRDS_ALLOCATION
-- Lectura pública; mutaciones service_role only (sin policies de insert/update).
-- ============================================================================
create policy "teams select all" on teams for select using (true);
create policy "matches select all" on matches for select using (true);
create policy "scoring_params select all" on scoring_params for select using (true);
create policy "deadlines select all" on deadlines for select using (true);
create policy "admin_config select all" on admin_config for select using (true);
create policy "thirds_allocation select all" on thirds_allocation for select using (true);

-- ============================================================================
-- PREDICTIONS — todos leen (la app esconde post-deadline); jugador escribe propio.
-- ============================================================================
create policy "predictions select all" on predictions
  for select using (true);

create policy "predictions insert own" on predictions
  for insert with check (player_id = current_player_id());

create policy "predictions update own" on predictions
  for update using (player_id = current_player_id())
  with check (player_id = current_player_id());

-- ============================================================================
-- THIRD_PICKS / BRACKET_PICKS / EARLY_BRACKET_PICKS — misma lógica
-- ============================================================================
create policy "third_picks select all" on third_picks for select using (true);
create policy "third_picks insert own" on third_picks
  for insert with check (player_id = current_player_id());
create policy "third_picks update own" on third_picks
  for update using (player_id = current_player_id())
  with check (player_id = current_player_id());
create policy "third_picks delete own" on third_picks
  for delete using (player_id = current_player_id());

create policy "bracket_picks select all" on bracket_picks for select using (true);
create policy "bracket_picks insert own" on bracket_picks
  for insert with check (player_id = current_player_id());
create policy "bracket_picks update own" on bracket_picks
  for update using (player_id = current_player_id())
  with check (player_id = current_player_id());

create policy "early_bracket_picks select all" on early_bracket_picks for select using (true);
create policy "early_bracket_picks insert own" on early_bracket_picks
  for insert with check (player_id = current_player_id());
create policy "early_bracket_picks update own" on early_bracket_picks
  for update using (player_id = current_player_id())
  with check (player_id = current_player_id());

-- ============================================================================
-- AUDIT_LOG — solo service_role escribe; admins leen
-- ============================================================================
create policy "audit_log select admin" on audit_log
  for select using (
    exists (select 1 from players where id = current_player_id() and is_admin)
  );

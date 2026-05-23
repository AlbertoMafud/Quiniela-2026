-- Heartbeat de presencia: tracking básico de cuándo cada jugador estuvo activo.
-- Se actualiza desde el cliente cada minuto via server action.
-- Admin lo usa para ver quién está en línea ahora mismo.

alter table players add column if not exists last_seen_at timestamptz;

create index if not exists idx_players_last_seen
  on players (last_seen_at desc nulls last)
  where last_seen_at is not null;

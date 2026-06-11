-- Config de bolsa y cierres (idempotente). value es jsonb.
insert into admin_config (key, value) values
  ('pot_cuota', '400'::jsonb),
  ('pot_split', '{"first":50,"second":30,"third":20}'::jsonb),
  ('tournament_start_at', '""'::jsonb),
  ('registration_override', '"auto"'::jsonb),
  ('stage_overrides', '{}'::jsonb)
on conflict (key) do nothing;

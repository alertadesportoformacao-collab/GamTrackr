-- Suporte a eventos de período (início e fim)
ALTER TABLE game_events ADD COLUMN IF NOT EXISTS minute_end INTEGER;

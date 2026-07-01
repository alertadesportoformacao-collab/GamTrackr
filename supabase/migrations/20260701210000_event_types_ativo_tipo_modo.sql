-- Ações de Jogo: adicionar campos ativo, tipo e modo

ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tipo  TEXT    NOT NULL DEFAULT 'imediato',
  ADD COLUMN IF NOT EXISTS modo  TEXT;

-- Migrar registro_tipo existente para novo campo modo
UPDATE event_types
SET modo = CASE registro_tipo
  WHEN 'realtime'  THEN 'live'
  WHEN 'postmatch' THEN 'pos_jogo'
  ELSE 'live'
END
WHERE modo IS NULL;

-- Definir NOT NULL e default após migração
ALTER TABLE event_types
  ALTER COLUMN modo SET DEFAULT 'live',
  ALTER COLUMN modo SET NOT NULL;

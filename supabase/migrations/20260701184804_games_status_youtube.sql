-- Add status and youtube_url to games
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'finished')),
  ADD COLUMN IF NOT EXISTS youtube_url TEXT;

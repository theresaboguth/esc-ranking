-- Bingo wins: one row per (user, bingo_type), no duplicates
CREATE TABLE IF NOT EXISTS bingo_wins (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  bingo_type  TEXT        NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE bingo_wins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bingo wins readable"   ON bingo_wins FOR SELECT USING (true);
CREATE POLICY "Bingo wins insertable" ON bingo_wins FOR INSERT WITH CHECK (true);

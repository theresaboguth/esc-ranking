-- semi_final wird von der App nicht verwendet und blockiert alle Upserts
ALTER TABLE ratings ALTER COLUMN semi_final SET DEFAULT 0;
ALTER TABLE ratings ALTER COLUMN semi_final DROP NOT NULL;

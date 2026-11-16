-- Add the operating voltage to equipment records.
-- Existing equipment remains NULL until its voltage is confirmed.
-- Allowed values match the equipment registration form: 127 V or 220 V.
-- For complete account equipment persistence and access policies, also run
-- equipment-persistence.sql.

BEGIN;

ALTER TABLE public."Equipamento"
  ADD COLUMN IF NOT EXISTS tensao SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public."Equipamento"'::regclass
      AND conname = 'cold_ghost_ck_equipamento_tensao'
  ) THEN
    ALTER TABLE public."Equipamento"
      ADD CONSTRAINT cold_ghost_ck_equipamento_tensao
      CHECK (tensao IS NULL OR tensao IN (127, 220));
  END IF;
END;
$$;

COMMENT ON COLUMN public."Equipamento".tensao IS
  'Tensão de operação em volts (127 ou 220); NULL quando ainda não informada.';

COMMIT;

-- Confirm the column and its nullability after running this script.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Equipamento'
  AND column_name = 'tensao';

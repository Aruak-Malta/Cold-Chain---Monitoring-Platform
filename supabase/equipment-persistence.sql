-- Persist equipment metadata per company.
-- Telemetry JSON and analysis results remain in the session API.
-- Serial/MAC uniqueness is intentionally not enforced by this migration.

BEGIN;

ALTER TABLE public."Equipamento"
  ADD COLUMN IF NOT EXISTS nome TEXT,
  ADD COLUMN IF NOT EXISTS serial TEXT,
  ADD COLUMN IF NOT EXISTS setor TEXT,
  ADD COLUMN IF NOT EXISTS tensao SMALLINT;

DO $$
DECLARE
  equipment_table regclass := to_regclass('public."Equipamento"');
BEGIN
  IF equipment_table IS NULL THEN
    RAISE EXCEPTION 'A tabela public."Equipamento" não existe.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = equipment_table
      AND attname = 'id_equipamento'
      AND NOT attisdropped
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_attribute
    WHERE attrelid = equipment_table
      AND attname = 'id_company'
      AND NOT attisdropped
  ) THEN
    RAISE EXCEPTION
      'A tabela public."Equipamento" precisa ter id_equipamento e id_company.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public."Equipamento"
    WHERE nome IS NULL
      OR btrim(nome) = ''
      OR serial IS NULL
      OR btrim(serial) = ''
  ) THEN
    RAISE EXCEPTION
      'Preencha nome e serial dos equipamentos existentes antes de habilitar o cadastro pela aplicação.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = equipment_table
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

ALTER TABLE public."Equipamento" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."Equipamento" FROM PUBLIC, anon, authenticated;
GRANT SELECT (id_equipamento, id_company, nome, serial, setor, tensao)
  ON TABLE public."Equipamento" TO authenticated;
GRANT INSERT (id_company, nome, serial, setor, tensao)
  ON TABLE public."Equipamento" TO authenticated;

DO $$
DECLARE
  sequence_name text;
BEGIN
  sequence_name := pg_get_serial_sequence('public."Equipamento"', 'id_equipamento');
  IF sequence_name IS NOT NULL THEN
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', sequence_name);
  END IF;
END;
$$;

DROP POLICY IF EXISTS cold_ghost_equipamento_read_company ON public."Equipamento";
CREATE POLICY cold_ghost_equipamento_read_company
  ON public."Equipamento"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."Company" AS company
      JOIN public."Login" AS login ON login.id_login = company.id_login
      WHERE company.id_company = "Equipamento".id_company
        AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS cold_ghost_equipamento_read_company_guard ON public."Equipamento";
CREATE POLICY cold_ghost_equipamento_read_company_guard
  ON public."Equipamento"
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."Company" AS company
      JOIN public."Login" AS login ON login.id_login = company.id_login
      WHERE company.id_company = "Equipamento".id_company
        AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS cold_ghost_equipamento_insert_company ON public."Equipamento";
CREATE POLICY cold_ghost_equipamento_insert_company
  ON public."Equipamento"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public."Company" AS company
      JOIN public."Login" AS login ON login.id_login = company.id_login
      WHERE company.id_company = "Equipamento".id_company
        AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS cold_ghost_equipamento_insert_company_guard ON public."Equipamento";
CREATE POLICY cold_ghost_equipamento_insert_company_guard
  ON public."Equipamento"
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public."Company" AS company
      JOIN public."Login" AS login ON login.id_login = company.id_login
      WHERE company.id_company = "Equipamento".id_company
        AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );

COMMIT;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Equipamento'
  AND column_name IN ('id_equipamento', 'id_company', 'nome', 'serial', 'setor', 'tensao')
ORDER BY ordinal_position;

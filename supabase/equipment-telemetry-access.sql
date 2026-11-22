-- Allows authenticated users to read sensor readings for their own company equipment.

BEGIN;

ALTER TABLE public."Data" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."Data" FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public."Data" TO authenticated;

DROP POLICY IF EXISTS cold_ghost_data_read_company ON public."Data";
CREATE POLICY cold_ghost_data_read_company
  ON public."Data"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."Equipamento" AS equipment
      JOIN public."Company" AS company ON company.id_company = equipment.id_company
      JOIN public."Login" AS login ON login.id_login = company.id_login
      WHERE equipment.id_equipamento = "Data".id_equipamento
        AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS cold_ghost_data_read_company_guard ON public."Data";
CREATE POLICY cold_ghost_data_read_company_guard
  ON public."Data"
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."Equipamento" AS equipment
      JOIN public."Company" AS company ON company.id_company = equipment.id_company
      JOIN public."Login" AS login ON login.id_login = company.id_login
      WHERE equipment.id_equipamento = "Data".id_equipamento
        AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'Data'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Data";
  END IF;
END;
$$;

COMMIT;

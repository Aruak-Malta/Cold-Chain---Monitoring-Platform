ALTER TABLE public."Login"
  ALTER COLUMN senha DROP NOT NULL;

ALTER TABLE public."Login" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Company" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."Login", public."Company" FROM PUBLIC, anon, authenticated;
GRANT SELECT (id_login, email, nome), INSERT (email, nome)
  ON TABLE public."Login" TO authenticated;
GRANT UPDATE (nome)
  ON TABLE public."Login" TO authenticated;
GRANT SELECT (id_company, id_login), INSERT (id_login, nome, cnpj)
  ON TABLE public."Company" TO authenticated;

DO $$
DECLARE
  sequence_name text;
BEGIN
  FOREACH sequence_name IN ARRAY ARRAY[
    pg_get_serial_sequence('public."Login"', 'id_login'),
    pg_get_serial_sequence('public."Company"', 'id_company')
  ]
  LOOP
    IF sequence_name IS NOT NULL THEN
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated', sequence_name);
    END IF;
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS cold_ghost_login_read_self ON public."Login";
CREATE POLICY cold_ghost_login_read_self
  ON public."Login"
  FOR SELECT TO authenticated
  USING (lower(email) = lower((SELECT auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS cold_ghost_login_read_self_guard ON public."Login";
CREATE POLICY cold_ghost_login_read_self_guard
  ON public."Login"
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (lower(email) = lower((SELECT auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS cold_ghost_login_insert_self ON public."Login";
CREATE POLICY cold_ghost_login_insert_self
  ON public."Login"
  FOR INSERT TO authenticated
  WITH CHECK (lower(email) = lower((SELECT auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS cold_ghost_login_insert_self_guard ON public."Login";
CREATE POLICY cold_ghost_login_insert_self_guard
  ON public."Login"
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (lower(email) = lower((SELECT auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS cold_ghost_login_update_self ON public."Login";
CREATE POLICY cold_ghost_login_update_self
  ON public."Login"
  FOR UPDATE TO authenticated
  USING (lower(email) = lower((SELECT auth.jwt() ->> 'email')))
  WITH CHECK (lower(email) = lower((SELECT auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS cold_ghost_login_update_self_guard ON public."Login";
CREATE POLICY cold_ghost_login_update_self_guard
  ON public."Login"
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (lower(email) = lower((SELECT auth.jwt() ->> 'email')))
  WITH CHECK (lower(email) = lower((SELECT auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS cold_ghost_company_read_self ON public."Company";
CREATE POLICY cold_ghost_company_read_self
  ON public."Company"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."Login" AS login
      WHERE login.id_login = "Company".id_login
        AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS cold_ghost_company_read_self_guard ON public."Company";
CREATE POLICY cold_ghost_company_read_self_guard
  ON public."Company"
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public."Login" AS login
      WHERE login.id_login = "Company".id_login
        AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS cold_ghost_company_insert_self ON public."Company";
CREATE POLICY cold_ghost_company_insert_self
  ON public."Company"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public."Login" AS login
      WHERE login.id_login = "Company".id_login
        AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );

DROP POLICY IF EXISTS cold_ghost_company_insert_self_guard ON public."Company";
CREATE POLICY cold_ghost_company_insert_self_guard
  ON public."Company"
  AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public."Login" AS login
      WHERE login.id_login = "Company".id_login
        AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
    )
  );

GRANT UPDATE (nome)
  ON TABLE public."Login" TO authenticated;

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

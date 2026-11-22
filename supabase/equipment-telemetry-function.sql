-- Securely reads Data for equipment owned by the authenticated account.
-- Use this when direct RLS reads need to be diagnosed or bypassed safely.

BEGIN;

CREATE OR REPLACE FUNCTION public.cold_ghost_fetch_telemetry(
  p_equipment_ids bigint[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_readings jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_equipment_ids IS NULL OR cardinality(p_equipment_ids) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public."Equipamento" AS equipment
    WHERE equipment.id_equipamento = ANY(p_equipment_ids)
      AND NOT EXISTS (
        SELECT 1
        FROM public."Company" AS company
        JOIN public."Login" AS login ON login.id_login = company.id_login
        WHERE company.id_company = equipment.id_company
          AND lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
      )
  ) THEN
    RAISE EXCEPTION 'Equipamento não pertence à conta autenticada';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id_data', data.id_data,
        'id_equipamento', data.id_equipamento,
        'corrente', data.corrente,
        'temperatura', data.temperatura,
        'umidade', data.umidade,
        'timestamp', data.timestamp
      )
      ORDER BY data.timestamp ASC
    ),
    '[]'::jsonb
  )
  INTO v_readings
  FROM public."Data" AS data
  WHERE data.id_equipamento = ANY(p_equipment_ids);

  RETURN v_readings;
END;
$$;

REVOKE ALL ON FUNCTION public.cold_ghost_fetch_telemetry(bigint[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cold_ghost_fetch_telemetry(bigint[])
  TO authenticated;

COMMIT;

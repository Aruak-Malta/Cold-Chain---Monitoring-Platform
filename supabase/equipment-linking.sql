-- Links an equipment record created by the sensor/broker to an authenticated company.
-- It does not create a new Equipamento row.

BEGIN;

CREATE OR REPLACE FUNCTION public.cold_ghost_link_equipment(
  p_mac_address text,
  p_company_id bigint,
  p_name text,
  p_setor text,
  p_tensao smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_login_id bigint;
  v_normalized_mac text;
  v_equipment record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  v_normalized_mac := upper(regexp_replace(coalesce(p_mac_address, ''), '[^0-9A-F]', '', 'g'));
  IF length(v_normalized_mac) = 0 THEN
    RAISE EXCEPTION 'Informe o MAC Address do dispositivo';
  END IF;

  SELECT login.id_login
  INTO v_login_id
  FROM public."Login" AS login
  WHERE lower(login.email) = lower((SELECT auth.jwt() ->> 'email'))
  LIMIT 1;

  IF v_login_id IS NULL THEN
    RAISE EXCEPTION 'Perfil da conta não encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public."Company" AS company
    WHERE company.id_company = p_company_id
      AND company.id_login = v_login_id
  ) THEN
    RAISE EXCEPTION 'Empresa não pertence à conta autenticada';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public."Equipamento" AS equipment
    WHERE equipment.id_company IS NOT NULL
      AND upper(regexp_replace(coalesce(equipment.mac_address, ''), '[^0-9A-F]', '', 'g')) = v_normalized_mac
  ) THEN
    RAISE EXCEPTION 'Esse MAC Address já está vinculado a uma empresa';
  END IF;

  SELECT equipment.*
  INTO v_equipment
  FROM public."Equipamento" AS equipment
  WHERE equipment.id_company IS NULL
    AND upper(regexp_replace(coalesce(equipment.mac_address, ''), '[^0-9A-F]', '', 'g')) = v_normalized_mac
  FOR UPDATE;

  IF v_equipment.id_equipamento IS NULL THEN
    RAISE EXCEPTION 'Dispositivo não encontrado pelo MAC Address';
  END IF;

  UPDATE public."Equipamento"
  SET
    id_company = p_company_id,
    nome_equipamento = btrim(p_name),
    setor = p_setor,
    tensao = p_tensao
  WHERE id_equipamento = v_equipment.id_equipamento
  RETURNING *
  INTO v_equipment;

  RETURN jsonb_build_object(
    'id_equipamento', v_equipment.id_equipamento,
    'id_company', v_equipment.id_company,
    'nome_equipamento', v_equipment.nome_equipamento,
    'mac_address', v_equipment.mac_address,
    'setor', v_equipment.setor,
    'tensao', v_equipment.tensao
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cold_ghost_link_equipment(text, bigint, text, text, smallint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cold_ghost_link_equipment(text, bigint, text, text, smallint)
  TO authenticated;

COMMIT;

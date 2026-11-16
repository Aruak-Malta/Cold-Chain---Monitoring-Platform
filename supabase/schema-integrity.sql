DO $$
DECLARE
  relationship record;
  source_table regclass;
  referenced_table regclass;
  source_column_number smallint;
  referenced_column_number smallint;
  existing_constraint text;
  constraint_is_validated boolean;
BEGIN
  FOR relationship IN
    SELECT *
    FROM (VALUES
      ('Company', 'id_login', 'Login', 'id_login', 'cold_ghost_fk_company_login'),
      ('Equipamento', 'id_company', 'Company', 'id_company', 'cold_ghost_fk_equipamento_company'),
      ('Data', 'id_equipamento', 'Equipamento', 'id_equipamento', 'cold_ghost_fk_data_equipamento'),
      ('Limites', 'id_equipamento', 'Equipamento', 'id_equipamento', 'cold_ghost_fk_limites_equipamento'),
      ('Avisos', 'id_equipamento', 'Equipamento', 'id_equipamento', 'cold_ghost_fk_avisos_equipamento'),
      ('Avisos', 'id_limites', 'Limites', 'id_limites', 'cold_ghost_fk_avisos_limites')
    ) AS expected(
      source_table_name,
      source_column_name,
      referenced_table_name,
      referenced_column_name,
      constraint_name
    )
  LOOP
    source_table := to_regclass(format('public.%I', relationship.source_table_name));
    referenced_table := to_regclass(format('public.%I', relationship.referenced_table_name));

    IF source_table IS NULL OR referenced_table IS NULL THEN
      RAISE EXCEPTION
        'Tabela necessária não encontrada: public.% ou public.%. Verifique o schema antes de executar.',
        relationship.source_table_name,
        relationship.referenced_table_name;
    END IF;

    SELECT attribute.attnum
      INTO source_column_number
      FROM pg_attribute AS attribute
     WHERE attribute.attrelid = source_table
       AND attribute.attname = relationship.source_column_name
       AND NOT attribute.attisdropped;

    SELECT attribute.attnum
      INTO referenced_column_number
      FROM pg_attribute AS attribute
     WHERE attribute.attrelid = referenced_table
       AND attribute.attname = relationship.referenced_column_name
       AND NOT attribute.attisdropped;

    IF source_column_number IS NULL OR referenced_column_number IS NULL THEN
      RAISE EXCEPTION
        'Coluna necessária não encontrada para o relacionamento public.%.% -> public.%.%',
        relationship.source_table_name,
        relationship.source_column_name,
        relationship.referenced_table_name,
        relationship.referenced_column_name;
    END IF;

    SELECT constraint_row.conname, constraint_row.convalidated
      INTO existing_constraint, constraint_is_validated
      FROM pg_constraint AS constraint_row
     WHERE constraint_row.contype = 'f'
       AND constraint_row.conrelid = source_table
       AND constraint_row.confrelid = referenced_table
       AND constraint_row.conkey = ARRAY[source_column_number]::smallint[]
       AND constraint_row.confkey = ARRAY[referenced_column_number]::smallint[]
     LIMIT 1;

    IF FOUND THEN
      IF NOT constraint_is_validated THEN
        EXECUTE format(
          'ALTER TABLE %I.%I VALIDATE CONSTRAINT %I',
          'public',
          relationship.source_table_name,
          existing_constraint
        );
        RAISE NOTICE 'Relacionamento validado: public.%.%', relationship.source_table_name, existing_constraint;
      ELSE
        RAISE NOTICE 'Relacionamento já existe: public.%.%', relationship.source_table_name, existing_constraint;
      END IF;
    ELSE
      EXECUTE format(
        'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I (%I)',
        'public',
        relationship.source_table_name,
        relationship.constraint_name,
        relationship.source_column_name,
        'public',
        relationship.referenced_table_name,
        relationship.referenced_column_name
      );
      RAISE NOTICE 'Relacionamento criado: public.%.%', relationship.source_table_name, relationship.constraint_name;
    END IF;
  END LOOP;
END;
$$;

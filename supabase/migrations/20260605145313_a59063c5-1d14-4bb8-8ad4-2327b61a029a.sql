DO $$
DECLARE
  run_rec record;
  d jsonb;
  num text;
  hist jsonb;
  current_end_raw text;
  current_end text;
  cur_endo jsonb;
  base_proposta jsonb;
  proposta_out jsonb;
  is_apolice boolean;
  v_policy_id uuid;
  e jsonb;
  idx int;
  end_raw text;
BEGIN
  SELECT id, raw INTO run_rec
  FROM public.policy_sync_runs
  WHERE status = 'success' AND raw IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  IF run_rec.id IS NULL THEN
    RAISE NOTICE 'no successful run to backfill';
    RETURN;
  END IF;

  FOR d IN SELECT * FROM jsonb_array_elements(run_rec.raw->'dados') LOOP
    num := COALESCE(d->>'numero_apolice_seguradora', d->>'numero_apolice', d->>'numeroApolice');
    IF num IS NULL THEN CONTINUE; END IF;
    hist := COALESCE(d->'historico_endossos', '[]'::jsonb);

    current_end_raw := COALESCE(d->>'numero_endosso_seguradora', d->>'numero_endosso', d->>'numeroEndosso');
    IF current_end_raw IS NULL THEN
      current_end := NULL;
    ELSE
      current_end := lpad(regexp_replace(current_end_raw, '\D', '', 'g'), 6, '0');
      IF current_end = '' THEN current_end := '000000'; END IF;
    END IF;

    cur_endo := NULL;
    IF current_end IS NOT NULL THEN
      SELECT h INTO cur_endo
      FROM jsonb_array_elements(hist) h
      WHERE lpad(regexp_replace(
              COALESCE(h->>'numero_endosso_seguradora', h->>'numero_endosso', h->>'numeroEndosso', ''),
              '\D', '', 'g'), 6, '0') = current_end
      LIMIT 1;
    END IF;
    IF cur_endo IS NULL AND jsonb_array_length(hist) > 0 THEN
      cur_endo := hist -> (jsonb_array_length(hist) - 1);
    END IF;

    base_proposta := COALESCE(cur_endo->'proposta', d->'proposta', '{}'::jsonb);
    is_apolice := current_end = '000000';
    IF is_apolice AND d ? 'data_emissao' THEN
      proposta_out := base_proposta || jsonb_build_object('data_emissao', d->'data_emissao');
    ELSE
      proposta_out := base_proposta;
    END IF;

    INSERT INTO public.policies (numero_apolice, numero_endosso_atual, premio_liquido, proposta, last_sync_run_id, updated_at)
    VALUES (
      num,
      current_end,
      COALESCE((cur_endo->>'premio_liquido')::numeric, (d->>'premio_liquido')::numeric, 0),
      proposta_out,
      run_rec.id,
      now()
    )
    ON CONFLICT (numero_apolice) DO UPDATE SET
      numero_endosso_atual = EXCLUDED.numero_endosso_atual,
      premio_liquido = EXCLUDED.premio_liquido,
      proposta = EXCLUDED.proposta,
      last_sync_run_id = EXCLUDED.last_sync_run_id,
      updated_at = now()
    RETURNING id INTO v_policy_id;

    DELETE FROM public.endorsements WHERE policy_id = v_policy_id;
    idx := 0;
    FOR e IN SELECT * FROM jsonb_array_elements(hist) LOOP
      end_raw := COALESCE(e->>'numero_endosso_seguradora', e->>'numero_endosso', e->>'numeroEndosso');
      INSERT INTO public.endorsements (policy_id, numero_apolice, numero_endosso, premio_liquido, proposta, ordem)
      VALUES (
        v_policy_id,
        COALESCE(e->>'numero_apolice_seguradora', e->>'numero_apolice', num),
        CASE
          WHEN end_raw IS NULL OR end_raw = '' THEN lpad(idx::text, 6, '0')
          ELSE lpad(regexp_replace(end_raw, '\D', '', 'g'), 6, '0')
        END,
        COALESCE((e->>'premio_liquido')::numeric, 0),
        COALESCE(e->'proposta', '{}'::jsonb),
        idx
      );
      idx := idx + 1;
    END LOOP;
  END LOOP;
END $$;
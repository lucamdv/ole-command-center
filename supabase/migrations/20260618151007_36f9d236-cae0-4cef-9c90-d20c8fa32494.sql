ALTER TABLE public.audit_ignores RENAME COLUMN user_id TO created_by;
ALTER TABLE public.audit_ignores ALTER COLUMN created_by DROP NOT NULL;

DROP INDEX IF EXISTS public.audit_ignores_unique_idx;
DROP INDEX IF EXISTS public.audit_ignores_user_idx;

DELETE FROM public.audit_ignores a
USING public.audit_ignores b
WHERE a.ctid < b.ctid
  AND a.apolice = b.apolice
  AND COALESCE(a.tipo_erro, '') = COALESCE(b.tipo_erro, '');

CREATE UNIQUE INDEX audit_ignores_global_unique_idx
  ON public.audit_ignores (apolice, COALESCE(tipo_erro, ''));

DROP POLICY IF EXISTS "Users manage own audit ignores" ON public.audit_ignores;

CREATE POLICY "Authenticated can read audit ignores"
  ON public.audit_ignores
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert audit ignores"
  ON public.audit_ignores
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Authenticated can delete audit ignores"
  ON public.audit_ignores
  FOR DELETE
  TO authenticated
  USING (true);
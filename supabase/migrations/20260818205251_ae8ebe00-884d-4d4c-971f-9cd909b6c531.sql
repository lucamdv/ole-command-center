CREATE TABLE public.exception_reason_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX exception_reason_tags_name_key ON public.exception_reason_tags (lower(name));

GRANT SELECT ON public.exception_reason_tags TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exception_reason_tags TO authenticated;
GRANT ALL ON public.exception_reason_tags TO service_role;

ALTER TABLE public.exception_reason_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read reason tags"
  ON public.exception_reason_tags FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert reason tags"
  ON public.exception_reason_tags FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reason tags"
  ON public.exception_reason_tags FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reason tags"
  ON public.exception_reason_tags FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_exception_reason_tags
  BEFORE UPDATE ON public.exception_reason_tags
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.audit_ignores
  ADD COLUMN reason_tag_id uuid REFERENCES public.exception_reason_tags(id) ON DELETE SET NULL;

ALTER TABLE public.endorsement_exceptions
  ADD COLUMN reason_tag_id uuid REFERENCES public.exception_reason_tags(id) ON DELETE SET NULL;

INSERT INTO public.exception_reason_tags (name, color) VALUES
  ('Regra de negócio', '#2563EB'),
  ('Erro do motor', '#DC2626'),
  ('Aprovado pelo cliente', '#16A34A'),
  ('Duplicidade', '#D97706'),
  ('Em análise', '#7C3AED');
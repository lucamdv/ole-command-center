GRANT UPDATE ON public.audit_ignores TO authenticated;
CREATE POLICY "Authenticated can update audit ignores" ON public.audit_ignores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
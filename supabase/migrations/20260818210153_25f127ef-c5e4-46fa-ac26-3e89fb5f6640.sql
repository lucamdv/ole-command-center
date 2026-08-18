DROP POLICY IF EXISTS "Admins can delete reason tags" ON public.exception_reason_tags;
DROP POLICY IF EXISTS "Admins can insert reason tags" ON public.exception_reason_tags;
DROP POLICY IF EXISTS "Admins can update reason tags" ON public.exception_reason_tags;

CREATE POLICY "Admins can insert reason tags"
ON public.exception_reason_tags FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins can update reason tags"
ON public.exception_reason_tags FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));

CREATE POLICY "Admins can delete reason tags"
ON public.exception_reason_tags FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role));
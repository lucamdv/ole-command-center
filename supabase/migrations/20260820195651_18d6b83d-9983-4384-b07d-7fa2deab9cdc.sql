UPDATE public.policies p
SET numero_endosso_atual = sub.max_endosso
FROM (
  SELECT policy_id, MAX(numero_endosso) AS max_endosso
  FROM public.endorsements
  GROUP BY policy_id
) sub
WHERE sub.policy_id = p.id
  AND (p.numero_endosso_atual IS DISTINCT FROM sub.max_endosso);
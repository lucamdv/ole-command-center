/**
 * Verificação de papel de administrador feita no servidor.
 * Usa o client Supabase autenticado do chamador (RLS aplica-se) e lê apenas
 * as roles do próprio usuário — política "Users can view their own roles".
 */
export async function assertAdmin(ctx: {
  supabase: {
    from: (t: string) => any;
  };
  userId: string;
}) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

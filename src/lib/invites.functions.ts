import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const lookupInvite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ token: z.string().min(10).max(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const crypto = await import("crypto");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tokenHash = crypto.createHash("sha256").update(data.token).digest("hex");

    const { data: invite } = await supabaseAdmin
      .from("user_invites")
      .select("id, email, role, expires_at, used_at, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (!invite) return { valid: false as const, reason: "not_found" };
    if (invite.revoked_at) return { valid: false as const, reason: "revoked" };
    if (invite.used_at) return { valid: false as const, reason: "used" };
    if (new Date(invite.expires_at).getTime() < Date.now())
      return { valid: false as const, reason: "expired" };

    return { valid: true as const, email: invite.email, role: invite.role };
  });

export const consumeInvite = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        token: z.string().min(10).max(200),
        full_name: z.string().min(1).max(120),
        password: z.string().min(8).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const crypto = await import("crypto");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tokenHash = crypto.createHash("sha256").update(data.token).digest("hex");

    const { data: invite, error } = await supabaseAdmin
      .from("user_invites")
      .select("*")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error) throw error;
    if (!invite) throw new Error("Convite inválido");
    if (invite.revoked_at) throw new Error("Convite revogado");
    if (invite.used_at) throw new Error("Convite já utilizado");
    if (new Date(invite.expires_at).getTime() < Date.now())
      throw new Error("Convite expirado");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (cErr) throw cErr;
    const userId = created.user!.id;

    await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.full_name, created_by: invite.created_by })
      .eq("id", userId);

    if (invite.role !== "user") {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: invite.role });
    }

    // Atomically mark invite as used; if someone else used it first, undo user creation.
    const { data: claimed, error: uErr } = await supabaseAdmin
      .from("user_invites")
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq("id", invite.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (uErr || !claimed) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Convite já utilizado");
    }

    return { ok: true };
  });

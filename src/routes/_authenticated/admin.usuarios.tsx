import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { getCurrentRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  beforeLoad: async () => {
    try {
      const r = await getCurrentRole();
      if (!r.isAdmin) throw redirect({ to: "/" });
    } catch (err) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminUsersPanel,
});

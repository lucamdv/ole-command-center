import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/endossos")({
  beforeLoad: () => {
    throw redirect({ to: "/apolices", replace: true });
  },
});

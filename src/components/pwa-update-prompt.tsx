import { useEffect } from "react";
import { toast } from "sonner";
import { setupPwa } from "@/lib/pwa";

/**
 * Registers the service worker (production, non-preview only) and notifies the
 * user whenever a new version of the app is available.
 */
export function PwaUpdatePrompt() {
  useEffect(() => {
    return setupPwa({
      onNeedRefresh: (applyUpdate) => {
        toast("Nova versão disponível", {
          description: "Atualize para carregar a versão mais recente do Olé Copilot.",
          duration: Infinity,
          action: {
            label: "Atualizar",
            onClick: () => applyUpdate(),
          },
        });
      },
      onOfflineReady: () => {
        toast.success("App pronto para uso offline", {
          description: "O painel já pode ser aberto mesmo sem conexão.",
        });
      },
    });
  }, []);

  return null;
}

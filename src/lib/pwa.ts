/**
 * Guarded service-worker registration.
 *
 * The app-shell service worker must NEVER register in dev, inside an iframe,
 * or in any Lovable preview host — it would keep serving stale HTML/chunks.
 */
const SW_URL = "/sw.js";

function isPreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

function isRegistrationAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (isPreviewHost(window.location.hostname)) return false;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return false;
  return true;
}

async function unregisterAppServiceWorkers(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((registration) => {
          const scriptURL =
            registration.active?.scriptURL ??
            registration.waiting?.scriptURL ??
            registration.installing?.scriptURL ??
            "";
          return scriptURL.endsWith(SW_URL);
        })
        .map((registration) => registration.unregister()),
    );
  } catch {
    // ignore
  }
}

export type PwaCallbacks = {
  onNeedRefresh: (applyUpdate: () => void) => void;
  onOfflineReady?: () => void;
};

/** Registers the service worker when it is safe to do so. Returns a cleanup fn. */
export function setupPwa({ onNeedRefresh, onOfflineReady }: PwaCallbacks): () => void {
  let stopped = false;

  if (!isRegistrationAllowed()) {
    void unregisterAppServiceWorkers();
    return () => {
      stopped = true;
    };
  }

  void (async () => {
    try {
      const { registerSW } = await import("virtual:pwa-register");
      if (stopped) return;
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          onNeedRefresh(() => void updateSW(true));
        },
        onOfflineReady() {
          onOfflineReady?.();
        },
      });
    } catch {
      // plugin virtual module unavailable (e.g. dev) — nothing to do
    }
  })();

  return () => {
    stopped = true;
  };
}

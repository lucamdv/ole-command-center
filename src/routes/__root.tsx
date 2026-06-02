import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "../components/layout/app-shell";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <AppShell>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="text-[80px] font-semibold tracking-tight text-foreground">404</div>
          <div className="text-[14px] text-muted-foreground">Rota não encontrada no Centro de Comando.</div>
          <a href="/" className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium">
            Voltar à Visão Geral
          </a>
        </div>
      </div>
    </AppShell>
  );
}

function ErrorComponent({ error }: { error: Error; reset: () => void }) {
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <AppShell>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="text-[14px] font-semibold text-destructive">Falha no carregamento</div>
        <div className="text-[12px] text-muted-foreground mt-1">{error.message}</div>
      </div>
    </AppShell>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "OLÉ COPILOT — Centro de Comando Operacional" },
      { name: "description", content: "Plataforma de inteligência operacional para emissão de seguros: monitoramento, auditoria e analytics em tempo real." },
      { name: "theme-color", content: "#090F1F" },
      { property: "og:title", content: "OLÉ COPILOT — Centro de Comando Operacional" },
      { property: "og:description", content: "Plataforma de inteligência operacional para emissão de seguros: monitoramento, auditoria e analytics em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "OLÉ COPILOT — Centro de Comando Operacional" },
      { name: "twitter:description", content: "Plataforma de inteligência operacional para emissão de seguros: monitoramento, auditoria e analytics em tempo real." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/52814399-1fb7-4d72-9403-e7c02183fd5a/id-preview-2de711ff--5db7fa90-1492-4717-b26e-8b99a107e006.lovable.app-1780424640558.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/52814399-1fb7-4d72-9403-e7c02183fd5a/id-preview-2de711ff--5db7fa90-1492-4717-b26e-8b99a107e006.lovable.app-1780424640558.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="dark">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        <Outlet />
      </AppShell>
      <Toaster />
    </QueryClientProvider>
  );
}

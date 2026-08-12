import {
  AlertTriangle,
  BarChart3,
  FileText,
  LayoutDashboard,
  Radio,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";

export const NAV = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/operacao", label: "Operação", icon: Radio },
  { to: "/apolices", label: "Apólices", icon: FileText },
  { to: "/alertas", label: "Alertas", icon: AlertTriangle },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/ferramentas", label: "Ferramentas", icon: Wrench },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export const ADMIN_NAV = [
  { to: "/admin/usuarios", label: "Usuários", icon: ShieldCheck },
] as const;

export function isNavActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

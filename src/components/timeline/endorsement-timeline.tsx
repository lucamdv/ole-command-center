import { motion } from "framer-motion";
import { ArrowDown, CheckCircle2, XCircle } from "lucide-react";
import type { Endorsement } from "@/lib/mock/data";
import { formatBRL, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EndorsementTimeline({ items }: { items: Endorsement[] }) {
  return (
    <div className="space-y-0">
      {items.map((e, i) => {
        const failed = e.status === "REPROVADA";
        return (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            className="relative pl-12 pb-6 last:pb-0"
          >
            {/* Vertical connector */}
            {i < items.length - 1 && (
              <div className="absolute left-[18px] top-9 bottom-0 w-px bg-linear-to-b from-border to-transparent" />
            )}

            {/* Node */}
            <div
              className={cn(
                "absolute left-0 top-0 h-9 w-9 rounded-lg grid place-items-center font-mono text-[10px] font-semibold",
                failed
                  ? "bg-destructive/15 text-destructive border border-destructive/30"
                  : "bg-success/15 text-success border border-success/30",
              )}
            >
              {e.number.slice(-3)}
            </div>

            {/* Card */}
            <div className="panel hover:border-primary/30 transition-colors p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[12px] text-muted-foreground">#{e.number}</span>
                    <span className="text-[10.5px] text-muted-foreground">·</span>
                    <span className="text-[12px] text-muted-foreground">{formatDate(e.date)}</span>
                  </div>
                  <div className="text-[13.5px] font-semibold text-foreground">{e.type}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{e.description}</div>
                </div>

                <div
                  className={cn(
                    "shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-mono font-semibold border",
                    failed
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : "bg-success/10 text-success border-success/30",
                  )}
                >
                  {failed ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                  {e.status}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2 mt-2 border-t border-border/60">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-muted-foreground">Prêmio:</span>
                  <span className="font-mono text-foreground">{formatBRL(e.newPremium)}</span>
                  {e.premiumDelta !== 0 && (
                    <span className={cn("font-mono text-[10.5px]", e.premiumDelta > 0 ? "text-success" : "text-destructive")}>
                      {e.premiumDelta > 0 ? "+" : ""}
                      {formatBRL(e.premiumDelta)}
                    </span>
                  )}
                </div>
                {e.severity && (
                  <div className="ml-auto text-[10.5px] uppercase tracking-wider text-warning">
                    Severidade: {e.severity}
                  </div>
                )}
              </div>
            </div>

            {i < items.length - 1 && (
              <div className="absolute left-[10px] top-[44px] text-muted-foreground/40">
                <ArrowDown className="h-3 w-3" />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRun, startRun, type AuditRun } from "./runner.server";

export const startAudit = createServerFn({ method: "POST" }).handler(async () => {
  const run = startRun();
  return { runId: run.id };
});

export const getAuditStatus = createServerFn({ method: "GET" })
  .inputValidator(z.object({ runId: z.string().min(1) }))
  .handler(async ({ data }): Promise<AuditRun | { notFound: true }> => {
    const run = getRun(data.runId);
    if (!run) return { notFound: true };
    return run;
  });

// Server-only: embeddings + RAG indexing/search for Oléver.
// Uses Lovable AI Gateway embeddings (google/gemini-embedding-001 → 3072 dims).

const EMBEDDING_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBEDDING_MODEL = "google/gemini-embedding-001";
const MEMORY_ID = "00000000-0000-0000-0000-000000000001";

async function getAdmin() {
  const mod = await import("@/integrations/supabase/client.server");
  return mod.supabaseAdmin;
}

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const input = text.slice(0, 30000); // safety cap
  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding failed ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  const v = json.data?.[0]?.embedding;
  if (!v) throw new Error("Embedding response missing data[0].embedding");
  return v;
}

function pgvectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

async function upsertKnowledge(args: {
  kind: "policy" | "finding" | "memory" | "audit_run";
  ref_id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const sb = await getAdmin();
  const embedding = await embedText(`${args.title}\n\n${args.content}`);
  // Use rpc-less upsert via SQL through PostgREST is not possible for vector;
  // use direct SQL via service_role using the special "rest" call.
  // Supabase JS client supports inserting vectors as JS arrays since pgvector
  // accepts JSON array literal coercion via the PostgREST text representation.
  // To be safe across versions, we send the bracket string.
  const row = {
    kind: args.kind,
    ref_id: args.ref_id,
    title: args.title.slice(0, 240),
    content: args.content.slice(0, 12000),
    embedding: pgvectorLiteral(embedding),
    metadata: (args.metadata ?? {}) as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (sb as any)
    .from("oliver_knowledge")
    .upsert(row, { onConflict: "kind,ref_id" });
  if (error) throw error;
}

export async function indexPolicy(numero_apolice: string): Promise<void> {
  const sb = await getAdmin();
  const { data: policy } = await sb
    .from("policies")
    .select("numero_apolice, numero_endosso_atual, premio_liquido, proposta, updated_at")
    .eq("numero_apolice", numero_apolice)
    .maybeSingle();
  if (!policy) return;
  const { findSeguradoNome, translateProposta } = await import("@/lib/excelsior/translate");
  const segurado = findSeguradoNome(policy.proposta) ?? "(sem segurado)";
  let resumo = "";
  try {
    const t = translateProposta(policy.proposta);
    resumo = [
      t.dadosGerais?.tipoApolice ? `Tipo: ${t.dadosGerais.tipoApolice}` : null,
      t.dadosGerais?.sistemaOrigem ? `Sistema: ${t.dadosGerais.sistemaOrigem}` : null,
      t.dadosGerais?.ramoSusep ? `Ramo SUSEP: ${t.dadosGerais.ramoSusep}` : null,
      t.datas?.assinatura ? `Assinatura: ${t.datas.assinatura}` : null,
      t.datas?.inicioVigencia ? `Vigência: ${t.datas.inicioVigencia} → ${t.datas.fimVigencia ?? "?"}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  } catch {
    resumo = "(falha ao traduzir proposta)";
  }
  const title = `Apólice ${numero_apolice} — ${segurado}`;
  const content = [
    `Apólice: ${numero_apolice}`,
    `Endosso atual: ${policy.numero_endosso_atual ?? "?"}`,
    `Prêmio líquido: ${policy.premio_liquido ?? 0}`,
    `Segurado: ${segurado}`,
    resumo,
  ].join("\n");
  await upsertKnowledge({
    kind: "policy",
    ref_id: numero_apolice,
    title,
    content,
    metadata: { numero_apolice, segurado, endosso_atual: policy.numero_endosso_atual },
  });
}

export async function indexFinding(id: string): Promise<void> {
  const sb = await getAdmin();
  const { data: f } = await sb
    .from("audit_findings")
    .select("id, apolice, endosso, tipo_erro, data_inicio, data_fim, detalhes, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!f) return;
  const det = JSON.stringify(f.detalhes ?? {}).slice(0, 2000);
  const title = `Finding ${f.tipo_erro} — apólice ${f.apolice}`;
  const content = [
    `Apólice: ${f.apolice}`,
    `Endosso: ${f.endosso ?? "-"}`,
    `Tipo de erro: ${f.tipo_erro}`,
    `Vigência: ${f.data_inicio ?? "?"} → ${f.data_fim ?? "?"}`,
    `Detalhes: ${det}`,
  ].join("\n");
  await upsertKnowledge({
    kind: "finding",
    ref_id: f.id as string,
    title,
    content,
    metadata: { apolice: f.apolice, tipo_erro: f.tipo_erro },
  });
}

export async function indexMemoryDoc(): Promise<void> {
  const sb = await getAdmin();
  const { data } = await sb
    .from("oliver_memory")
    .select("content, updated_at")
    .eq("id", MEMORY_ID)
    .maybeSingle();
  const content = (data?.content as string) ?? "";
  if (!content.trim()) return;
  // Split markdown by H2 sections for finer-grained retrieval
  const sections = content.split(/\n(?=## )/g);
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i].trim();
    if (!sec) continue;
    const titleMatch = sec.match(/^##\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `Memória ${i}`;
    await upsertKnowledge({
      kind: "memory",
      ref_id: `section-${i}`,
      title: `Memória: ${title}`.slice(0, 240),
      content: sec,
      metadata: { section: i },
    });
  }
}

export interface KnowledgeMatch {
  id: string;
  kind: string;
  ref_id: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export async function searchKnowledge(opts: {
  query: string;
  kind?: "policy" | "finding" | "memory" | "audit_run";
  limit?: number;
}): Promise<KnowledgeMatch[]> {
  const sb = await getAdmin();
  const embedding = await embedText(opts.query);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb as any).rpc("match_oliver_knowledge", {
    query_embedding: pgvectorLiteral(embedding),
    match_count: opts.limit ?? 8,
    kind_filter: opts.kind ?? null,
  });
  if (error) throw error;
  return (data ?? []) as KnowledgeMatch[];
}

export async function reindexAll(): Promise<{ policies: number; findings: number; memorySections: number }> {
  const sb = await getAdmin();
  const [{ data: pols }, { data: finds }] = await Promise.all([
    sb.from("policies").select("numero_apolice").limit(1000),
    sb.from("audit_findings").select("id").order("created_at", { ascending: false }).limit(2000),
  ]);
  let p = 0;
  for (const row of pols ?? []) {
    try {
      await indexPolicy(row.numero_apolice as string);
      p++;
    } catch (e) {
      console.error("[oliver-rag] indexPolicy failed", row.numero_apolice, e);
    }
  }
  let f = 0;
  for (const row of finds ?? []) {
    try {
      await indexFinding(row.id as string);
      f++;
    } catch (e) {
      console.error("[oliver-rag] indexFinding failed", row.id, e);
    }
  }
  let m = 0;
  try {
    await indexMemoryDoc();
    m = 1;
  } catch (e) {
    console.error("[oliver-rag] indexMemoryDoc failed", e);
  }
  return { policies: p, findings: f, memorySections: m };
}

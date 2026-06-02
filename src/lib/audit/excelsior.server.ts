// Cliente HTTP para a API Excelsior (sistemaexcelsior + servicos-excelsior-prod).
// Server-only — usa credenciais sensíveis via process.env.

const LOGIN_URL = "https://api.sistemaexcelsior.com.br/v1/login";
const EMISSAO_LIST_URL = "http://api.sistemaexcelsior.com.br/backoffice/ro/emissao/?sistema=1009";
const EMISSAO_DOC_URL = (doc: string) =>
  `http://api.sistemaexcelsior.com.br/backoffice/ro/emissao/${doc}`;
const CONTRATOS_URL = (apolice: string) =>
  `https://servicos-excelsior-prod.azure-api.net/backoffice/ro/contratos/${apolice}`;

interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 400 * Math.pow(2, i)));
  }
  throw lastErr instanceof Error ? lastErr : new Error("Request failed");
}

export async function authenticate(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  const usuario = process.env.EXCELSIOR_USERNAME;
  const senha = process.env.EXCELSIOR_PASSWORD;
  if (!usuario || !senha) {
    throw new Error("Credenciais Excelsior não configuradas (EXCELSIOR_USERNAME/EXCELSIOR_PASSWORD).");
  }

  const res = await fetchWithRetry(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ usuario, senha }),
  });
  if (!res.ok) {
    throw new Error(`Falha de autenticação Excelsior (HTTP ${res.status}).`);
  }
  const data: any = await res.json();
  const token = data?.token || data?.access_token;
  if (!token) throw new Error("Resposta de autenticação sem token.");
  tokenCache = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return token;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}

export async function listDocuments(token: string): Promise<any[]> {
  const res = await fetchWithRetry(EMISSAO_LIST_URL, { method: "GET", headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Falha ao listar emissões (HTTP ${res.status}).`);
  const data: any = await res.json();
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.documentos)) return data.documentos;
  return [];
}

export async function getContrato(token: string, numeroApolice: string): Promise<any> {
  const res = await fetchWithRetry(CONTRATOS_URL(numeroApolice), {
    method: "GET",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Falha ao buscar contrato ${numeroApolice} (HTTP ${res.status}).`);
  return res.json();
}

export async function getEmissaoDoc(token: string, numeroDocumento: string): Promise<any> {
  const res = await fetchWithRetry(EMISSAO_DOC_URL(numeroDocumento), {
    method: "POST",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Falha ao buscar endosso ${numeroDocumento} (HTTP ${res.status}).`);
  return res.json();
}

// Concorrência limitada simples
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

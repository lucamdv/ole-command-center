// Tabela de tradução copiada do <datalist sistemas-origem> do PIPE.
export const SISTEMAS_ORIGEM: Record<string, string> = {
  "1000": "Excelsior Seguros",
  "1001": "OnPoint",
  "1002": "Azos",
  "1003": "Justos",
  "1004": "Ebix",
  "1009": "Olé",
  "1010": "Editor de Propostas",
  "1011": "RCP",
  "1012": "Residência - Poupex/Proseg",
  "1013": "Faturamento DEHAB",
  "1014": "Yolo Coliving",
  "1030": "Automações PIPE",
};

export const sistemaOrigemLabel = (codigo: string | number | null | undefined) => {
  if (codigo === null || codigo === undefined) return null;
  const k = String(codigo);
  return SISTEMAS_ORIGEM[k] ? `${SISTEMAS_ORIGEM[k]} [${k}]` : k;
};

export const TIPO_PESSOA_LABEL: Record<string, string> = {
  NATURAL: "Pessoa física",
  JURIDICA: "Pessoa jurídica",
};

export const NATUREZA_PREMIO_LABEL: Record<string, string> = {
  PREMIO: "Prêmio",
  IMPOSTO: "Impostos",
  CUSTOS: "Custos",
  INTERMEDIACAO: "Intermediação",
};

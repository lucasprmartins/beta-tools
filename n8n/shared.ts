import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface ConfigN8n {
  baseUrl: string;
  apiKey: string;
  tag: string;
}

export interface TagN8n {
  id: string;
  name: string;
}

export interface WorkflowRemoto {
  id: string;
  name: string;
  active: boolean;
  tags: TagN8n[];
  nodes: unknown[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WorkflowLimpo {
  name: string;
  nodes: unknown[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
}

const N8N_BASE = import.meta.dirname;

export const WORKFLOWS_DIR = join(N8N_BASE, "workflows");

async function carregarEnvArquivo(): Promise<Record<string, string>> {
  const envPath = join(N8N_BASE, ".env");
  let envContent: string;
  try {
    envContent = await readFile(envPath, "utf-8");
  } catch {
    return {};
  }

  const vars: Record<string, string> = {};
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    vars[key] = value;
  }
  return vars;
}

export async function carregarEnv(): Promise<ConfigN8n> {
  const baseUrl = process.env.N8N_URL;
  const apiKey = process.env.N8N_API_KEY;
  const tag = process.env.N8N_PROJECT_TAG;

  if (baseUrl && apiKey && tag) {
    return { baseUrl, apiKey, tag };
  }

  const vars = await carregarEnvArquivo();
  const config = {
    baseUrl: baseUrl ?? vars.N8N_URL,
    apiKey: apiKey ?? vars.N8N_API_KEY,
    tag: tag ?? vars.N8N_PROJECT_TAG,
  };

  if (!(config.baseUrl && config.apiKey && config.tag)) {
    ui.erro(
      "Variáveis N8N_URL, N8N_API_KEY e N8N_PROJECT_TAG não encontradas (process.env ou n8n/.env)"
    );
    process.exit(1);
  }

  return config as ConfigN8n;
}

export function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function requisicaoN8n<T>(
  config: ConfigN8n,
  metodo: string,
  caminho: string,
  corpo?: unknown
): Promise<T> {
  const url = new URL(caminho, config.baseUrl);

  const headers: Record<string, string> = {
    accept: "application/json",
    "X-N8N-API-KEY": config.apiKey,
  };

  const opcoes: RequestInit = { method: metodo, headers };

  if (corpo !== undefined) {
    headers["content-type"] = "application/json";
    opcoes.body = JSON.stringify(corpo);
  }

  const response = await fetch(url.toString(), opcoes);

  if (!response.ok) {
    const texto = await response.text();
    throw new Error(`${metodo} ${caminho} falhou: ${response.status} ${texto}`);
  }

  return response.json() as Promise<T>;
}

export async function listarWorkflows(
  config: ConfigN8n
): Promise<WorkflowRemoto[]> {
  const url = `/api/v1/workflows?tags=${encodeURIComponent(config.tag)}&limit=100`;
  const body = await requisicaoN8n<{ data: WorkflowRemoto[] }>(
    config,
    "GET",
    url
  );
  return body.data;
}

export async function buscarWorkflow(
  config: ConfigN8n,
  id: string
): Promise<WorkflowRemoto> {
  return await requisicaoN8n<WorkflowRemoto>(
    config,
    "GET",
    `/api/v1/workflows/${id}`
  );
}

export function limparWorkflow(workflow: WorkflowRemoto): WorkflowLimpo {
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings,
  };
}

export const ui = {
  ok: (msg: string) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
  aviso: (msg: string) => console.log(`\x1b[33m!\x1b[0m ${msg}`),
  erro: (msg: string) => console.error(`\x1b[31m✗\x1b[0m ${msg}`),
  titulo: (label: string) => {
    console.log();
    console.log(`\x1b[1m${label}\x1b[0m`);
    console.log(`\x1b[2m${"─".repeat(35)}\x1b[0m`);
    console.log();
  },
  resumo: (msg: string) => {
    console.log();
    console.log(`\x1b[2m${"─".repeat(35)}\x1b[0m`);
    console.log(`\x1b[32m✓\x1b[0m ${msg}`);
    console.log();
  },
};

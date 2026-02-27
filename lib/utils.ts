import { existsSync, readdirSync, readFileSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { cancel, isCancel } from "@clack/prompts";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ProjectConfig {
  name?: string;
  owner?: string;
  tools?: string[];
  railway?: { workspace: string };
}

// ─── Cancelamento ────────────────────────────────────────────────────────────

export function verificarCancelamento<T>(
  valor: T,
  mensagem = "Operação cancelada."
): asserts valor is Exclude<T, symbol> {
  if (isCancel(valor)) {
    cancel(mensagem);
    process.exit(0);
  }
}

// ─── Projeto ─────────────────────────────────────────────────────────────────

export function resolverProjeto(): string {
  const pai = resolve(import.meta.dirname, "..", "..");
  const candidatos = readdirSync(pai, { withFileTypes: true });

  for (const entry of candidatos) {
    if (!entry.isDirectory() || entry.name === "beta-tools") {
      continue;
    }
    const candidato = resolve(pai, entry.name);
    const pkg = resolve(candidato, "package.json");
    if (existsSync(pkg)) {
      try {
        const conteudo = readFileSync(pkg, "utf-8");
        const json = JSON.parse(conteudo) as Record<string, unknown>;
        if (Array.isArray(json.workspaces)) {
          return candidato;
        }
      } catch {
        // package.json inválido, ignorar
      }
    }
  }

  throw new Error(
    "Projeto beta não encontrado ao lado de beta-tools. Verifique se os diretórios estão no mesmo nível."
  );
}

// ─── Config ──────────────────────────────────────────────────────────────────

export async function lerConfig(root: string): Promise<ProjectConfig> {
  const caminho = resolve(root, "config.json");
  if (!existsSync(caminho)) {
    return {};
  }
  const conteudo = await readFile(caminho, "utf-8");
  return JSON.parse(conteudo) as ProjectConfig;
}

export async function salvarConfig(
  root: string,
  config: ProjectConfig
): Promise<void> {
  const caminho = resolve(root, "config.json");
  await writeFile(caminho, `${JSON.stringify(config, null, 2)}\n`);
}

// ─── Idempotência ────────────────────────────────────────────────────────────

export async function jaInstalado(
  root: string,
  nome: string,
  arquivoPrincipal: string
): Promise<boolean> {
  const config = await lerConfig(root);
  if (config.tools?.includes(nome)) {
    return true;
  }
  return existsSync(resolve(root, arquivoPrincipal));
}

export async function registrarTool(root: string, nome: string): Promise<void> {
  const config = await lerConfig(root);
  const tools = config.tools ?? [];
  if (!tools.includes(nome)) {
    tools.push(nome);
  }
  config.tools = tools;
  await salvarConfig(root, config);
}

// ─── Arquivos ────────────────────────────────────────────────────────────────

export async function copiarArquivo(
  origem: string,
  destino: string
): Promise<void> {
  await mkdir(dirname(destino), { recursive: true });
  await copyFile(origem, destino);
}

export async function criarArquivo(
  caminho: string,
  conteudo: string
): Promise<void> {
  await mkdir(dirname(caminho), { recursive: true });
  await writeFile(caminho, conteudo);
}

// ─── Package.json ────────────────────────────────────────────────────────────

export async function adicionarScripts(
  pkgPath: string,
  scripts: Record<string, string>
): Promise<void> {
  const conteudo = await readFile(pkgPath, "utf-8");
  const pkg = JSON.parse(conteudo) as Record<string, unknown>;
  const existentes = (pkg.scripts ?? {}) as Record<string, string>;

  for (const [chave, valor] of Object.entries(scripts)) {
    existentes[chave] = valor;
  }

  pkg.scripts = existentes;
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

// ─── .gitignore ──────────────────────────────────────────────────────────────

export async function adicionarAoGitignore(
  root: string,
  linhas: string[]
): Promise<void> {
  const caminho = resolve(root, ".gitignore");
  const conteudo = existsSync(caminho) ? await readFile(caminho, "utf-8") : "";

  const novas = linhas.filter((linha) => !conteudo.includes(linha));
  if (novas.length === 0) {
    return;
  }

  const sufixo = conteudo.endsWith("\n") ? "" : "\n";
  await writeFile(caminho, `${conteudo}${sufixo}${novas.join("\n")}\n`);
}

// ─── Documentação (.claude) ──────────────────────────────────────────────────

const INFRA_MD_PATH = ".claude/rules/server/infra.md";

export async function adicionarDocIntegracao(
  root: string,
  secao: string,
  conteudo: string
): Promise<void> {
  const caminho = resolve(root, INFRA_MD_PATH);
  if (!existsSync(caminho)) {
    return;
  }

  const atual = await readFile(caminho, "utf-8");
  if (atual.includes(secao)) {
    return;
  }

  const sufixo = atual.endsWith("\n") ? "" : "\n";
  await writeFile(caminho, `${atual}${sufixo}\n${conteudo}\n`);
}

const ENV_SCHEMA_REGEX = /(\n)(}\);)/;

// ─── Variáveis de ambiente ───────────────────────────────────────────────────

export async function adicionarEnvVars(
  envPath: string,
  vars: Record<string, string>
): Promise<void> {
  if (!existsSync(envPath)) {
    return;
  }

  const conteudo = await readFile(envPath, "utf-8");
  const novas: string[] = [];

  for (const [chave, valor] of Object.entries(vars)) {
    if (!conteudo.includes(`${chave}=`)) {
      novas.push(`${chave}=${valor}`);
    }
  }

  if (novas.length === 0) {
    return;
  }

  const sufixo = conteudo.endsWith("\n") ? "" : "\n";
  await writeFile(envPath, `${conteudo}${sufixo}${novas.join("\n")}\n`);
}

export async function adicionarEnvSchema(
  envTsPath: string,
  campos: string[]
): Promise<void> {
  let conteudo = await readFile(envTsPath, "utf-8");

  const camposNovos = campos.filter((campo) => !conteudo.includes(campo));
  if (camposNovos.length === 0) {
    return;
  }

  if (!ENV_SCHEMA_REGEX.test(conteudo)) {
    throw new Error(
      "Não foi possível localizar o schema no env.ts. Adicione as variáveis manualmente."
    );
  }

  const inserir = camposNovos.map((c) => `  ${c}`).join("\n");
  conteudo = conteudo.replace(ENV_SCHEMA_REGEX, `\n${inserir}\n$2`);

  await writeFile(envTsPath, conteudo);
}

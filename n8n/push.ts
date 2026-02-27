import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type ConfigN8n,
  carregarEnv,
  listarWorkflows,
  requisicaoN8n,
  type TagN8n,
  ui,
  type WorkflowLimpo,
  type WorkflowRemoto,
  WORKFLOWS_DIR,
} from "./shared";

async function lerWorkflowsLocais(): Promise<WorkflowLimpo[]> {
  let arquivos: string[];
  try {
    const entries = await readdir(WORKFLOWS_DIR);
    arquivos = entries.filter((f) => f.endsWith(".json"));
  } catch {
    ui.erro("Pasta n8n/workflows/ não encontrada. Execute bun n8n:pull primeiro.");
    process.exit(1);
  }

  const workflows: WorkflowLimpo[] = [];
  for (const arquivo of arquivos) {
    const conteudo = await readFile(join(WORKFLOWS_DIR, arquivo), "utf-8");
    workflows.push(JSON.parse(conteudo) as WorkflowLimpo);
  }
  return workflows;
}

async function buscarOuCriarTag(config: ConfigN8n): Promise<string> {
  const body = await requisicaoN8n<{ data: TagN8n[] }>(
    config,
    "GET",
    "/api/v1/tags?limit=100"
  );

  const existente = body.data.find((t) => t.name === config.tag);
  if (existente) {
    return existente.id;
  }

  const nova = await requisicaoN8n<TagN8n>(config, "POST", "/api/v1/tags", {
    name: config.tag,
  });
  ui.ok(`Tag "${config.tag}" criada (${nova.id})`);
  return nova.id;
}

async function criarWorkflow(
  config: ConfigN8n,
  workflow: WorkflowLimpo
): Promise<string> {
  const criado = await requisicaoN8n<WorkflowRemoto>(
    config,
    "POST",
    "/api/v1/workflows",
    workflow
  );
  return criado.id;
}

async function atualizarWorkflow(
  config: ConfigN8n,
  id: string,
  workflow: WorkflowLimpo
): Promise<void> {
  await requisicaoN8n(config, "PUT", `/api/v1/workflows/${id}`, workflow);
}

async function associarTag(
  config: ConfigN8n,
  workflowId: string,
  tagId: string
): Promise<void> {
  await requisicaoN8n(config, "PUT", `/api/v1/workflows/${workflowId}/tags`, [
    { id: tagId },
  ]);
}

async function main() {
  const config = await carregarEnv();

  ui.titulo("n8n push");

  const locais = await lerWorkflowsLocais();

  if (locais.length === 0) {
    ui.aviso("Nenhum arquivo .json encontrado em n8n/workflows/.");
    return;
  }

  ui.ok(`Enviando ${locais.length} workflow(s) para ${config.baseUrl}...`);

  const remotos = await listarWorkflows(config);
  const tagId = await buscarOuCriarTag(config);

  let criados = 0;
  let atualizados = 0;
  let erros = 0;

  for (const local of locais) {
    const remoto = remotos.find((r) => r.name === local.name);

    try {
      if (remoto) {
        await atualizarWorkflow(config, remoto.id, local);
        ui.ok(`[atualizado] ${local.name}`);
        atualizados++;
      } else {
        const novoId = await criarWorkflow(config, local);
        await associarTag(config, novoId, tagId);
        ui.ok(`[criado] ${local.name}`);
        criados++;
      }
    } catch (err) {
      ui.erro(`[erro] ${local.name}: ${err instanceof Error ? err.message : err}`);
      erros++;
    }
  }

  ui.resumo(`${criados} criado(s), ${atualizados} atualizado(s), ${erros} erro(s)`);

  if (erros > 0) {
    process.exit(1);
  }
}

main();

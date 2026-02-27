import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buscarWorkflow,
  carregarEnv,
  limparWorkflow,
  listarWorkflows,
  slugificar,
  ui,
  WORKFLOWS_DIR,
} from "./shared";

async function main() {
  const config = await carregarEnv();

  ui.titulo("n8n pull");

  ui.ok(`Buscando workflows com a tag "${config.tag}"...`);

  const workflows = await listarWorkflows(config);

  if (workflows.length === 0) {
    ui.aviso("Nenhum workflow encontrado com essa tag.");
    return;
  }

  ui.ok(`${workflows.length} workflow(s) encontrado(s). Baixando...`);

  await mkdir(WORKFLOWS_DIR, { recursive: true });

  for (const wf of workflows) {
    const completo = await buscarWorkflow(config, wf.id);
    const limpo = limparWorkflow(completo);
    const fileName = `${slugificar(limpo.name)}.json`;
    const filePath = join(WORKFLOWS_DIR, fileName);

    await writeFile(filePath, JSON.stringify(limpo, null, 2));
    ui.ok(`${limpo.name} → ${fileName}`);
  }

  ui.resumo(`${workflows.length} workflow(s) salvo(s) em n8n/workflows/`);
}

main();

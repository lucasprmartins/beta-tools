import { intro, log, multiselect, outro } from "@clack/prompts";
import pc from "picocolors";
import { n8n } from "./integrations/n8n";
import { storage } from "./integrations/storage";
import {
  jaInstalado,
  registrarTool,
  resolverProjeto,
  verificarCancelamento,
} from "./lib/utils";

const integracoes = [n8n, storage];

intro("Beta Tools");

const root = resolverProjeto();
log.success(`Projeto encontrado: ${pc.dim(root)}`);

// ─── Verificar integrações já instaladas ─────────────────────────────────────

const disponiveis: Array<{ value: string; label: string; hint: string }> = [];

for (const integracao of integracoes) {
  const instalado = await jaInstalado(
    root,
    integracao.nome,
    integracao.arquivoPrincipal
  );

  if (instalado) {
    log.info(`${integracao.nome} ${pc.dim("já instalado, pulando")}`);
  } else {
    disponiveis.push({
      value: integracao.nome,
      label: integracao.nome,
      hint: integracao.descricao,
    });
  }
}

if (disponiveis.length === 0) {
  outro("Todas as integrações já estão instaladas!");
  process.exit(0);
}

// ─── Seleção ─────────────────────────────────────────────────────────────────

const selecionadas = await multiselect({
  message: "Selecione as integrações:",
  options: disponiveis,
  required: true,
});
verificarCancelamento(selecionadas);

// ─── Instalação ──────────────────────────────────────────────────────────────

for (const nome of selecionadas) {
  const integracao = integracoes.find((i) => i.nome === nome);
  if (!integracao) {
    continue;
  }

  log.step(`Instalando ${pc.bold(integracao.nome)}...`);
  await integracao.instalar(root);
  await registrarTool(root, integracao.nome);
}

// ─── Resumo ──────────────────────────────────────────────────────────────────

outro(
  `${pc.bold(String(selecionadas.length))} integração(ões) instalada(s) com sucesso!`
);

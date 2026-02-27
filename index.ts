import { intro, log, multiselect, outro, select, text } from "@clack/prompts";
import pc from "picocolors";
import { n8n } from "./integrations/n8n";
import { storage } from "./integrations/storage";
import {
  buscarProjetos,
  jaInstalado,
  registrarTool,
  resolverProjeto,
  verificarCancelamento,
} from "./lib/utils";

const integracoes = [n8n, storage];

intro("Beta Tools");

// ─── Selecionar projeto ──────────────────────────────────────────────────────

const projetos = buscarProjetos();
let root: string;

if (projetos.length === 1) {
  const projeto = projetos[0] as (typeof projetos)[number];
  root = projeto.caminho;
  log.success(`Projeto detectado: ${pc.bold(projeto.nome)}`);
} else if (projetos.length > 1) {
  const escolha = await select({
    message: "Selecione o projeto:",
    options: projetos.map((p) => ({ value: p.nome, label: p.nome })),
  });
  verificarCancelamento(escolha);
  root = resolverProjeto(escolha);
} else {
  const nome = await text({
    message: "Nome do diretório do projeto:",
    placeholder: "meu-projeto",
    validate: (v) => {
      if (!v) {
        return "Nome é obrigatório.";
      }
    },
  });
  verificarCancelamento(nome);
  root = resolverProjeto(nome);
}

log.info(`Destino: ${pc.dim(root)}`);

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

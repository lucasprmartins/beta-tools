import { resolve } from "node:path";
import { log } from "@clack/prompts";
import {
  adicionarAoGitignore,
  adicionarDocIntegracao,
  adicionarScripts,
  copiarArquivo,
  criarArquivo,
} from "../lib/utils";

const IMPORTS_DIR = resolve(import.meta.dirname, "imports", "n8n");

const ARQUIVOS = [
  {
    origem: "client.ts",
    destino: "packages/infra/src/integrations/n8n.ts",
  },
  { origem: "pull.ts", destino: "n8n/pull.ts" },
  { origem: "push.ts", destino: "n8n/push.ts" },
  { origem: "shared.ts", destino: "n8n/shared.ts" },
];

const SCRIPTS = {
  "n8n:pull": "bun n8n/pull.ts",
  "n8n:push": "bun n8n/push.ts",
};

const ENV_EXAMPLE = ["N8N_URL=", "N8N_API_KEY=", "N8N_PROJECT_TAG=", ""].join(
  "\n"
);

export const n8n = {
  nome: "n8n",
  descricao: "Automação de workflows",
  arquivoPrincipal: "packages/infra/src/integrations/n8n.ts",

  async instalar(root: string): Promise<void> {
    for (const { origem, destino } of ARQUIVOS) {
      await copiarArquivo(resolve(IMPORTS_DIR, origem), resolve(root, destino));
    }
    log.success(`Arquivos copiados (${ARQUIVOS.length} arquivos)`);

    await adicionarScripts(resolve(root, "package.json"), SCRIPTS);
    log.success("Scripts n8n:pull e n8n:push adicionados ao package.json");

    await criarArquivo(resolve(root, "n8n/.env.example"), ENV_EXAMPLE);
    await criarArquivo(resolve(root, "n8n/workflows/.gitkeep"), "");
    log.success(".env.example e workflows/.gitkeep criados");

    await adicionarAoGitignore(root, ["/n8n/.env"]);
    log.success("/n8n/.env adicionado ao .gitignore");

    await adicionarDocIntegracao(
      root,
      "### n8n",
      "### n8n\n\n- Classe `N8n` com `path()` para webhooks tipados"
    );
    log.success("Documentação adicionada ao infra.md");
  },
};

import { resolve } from "node:path";
import { log } from "@clack/prompts";
import {
  adicionarDocIntegracao,
  adicionarEnvSchema,
  adicionarEnvVars,
  copiarArquivo,
} from "../lib/utils";

const IMPORTS_DIR = resolve(import.meta.dirname, "imports", "storage");

const ARQUIVOS = [
  {
    origem: "client.ts",
    destino: "packages/infra/src/integrations/storage.ts",
  },
  {
    origem: "cors.ts",
    destino: "packages/infra/src/integrations/storage-cors.ts",
  },
];

const ENV_VARS: Record<string, string> = {
  S3_ENDPOINT: "",
  S3_REGION: "",
  S3_ACCESS_KEY_ID: "",
  S3_SECRET_ACCESS_KEY: "",
  S3_BUCKET: "",
};

const ENV_SCHEMA_CAMPOS = [
  "S3_ENDPOINT: z.string().optional(),",
  "S3_REGION: z.string().optional(),",
  "S3_ACCESS_KEY_ID: z.string().optional(),",
  "S3_SECRET_ACCESS_KEY: z.string().optional(),",
  "S3_BUCKET: z.string().optional(),",
];

export const storage = {
  nome: "storage",
  descricao: "Armazenamento S3",
  arquivoPrincipal: "packages/infra/src/integrations/storage.ts",

  async instalar(root: string): Promise<void> {
    for (const { origem, destino } of ARQUIVOS) {
      await copiarArquivo(resolve(IMPORTS_DIR, origem), resolve(root, destino));
    }
    log.success(`Arquivos copiados (${ARQUIVOS.length} arquivos)`);

    await adicionarEnvSchema(
      resolve(root, "packages/infra/src/env.ts"),
      ENV_SCHEMA_CAMPOS
    );
    log.success("Variáveis S3 adicionadas ao env.ts");

    await adicionarEnvVars(resolve(root, "apps/server/.env"), ENV_VARS);
    log.success("Variáveis S3 adicionadas ao apps/server/.env");

    await adicionarDocIntegracao(
      root,
      "### Storage S3",
      [
        "### Storage S3",
        "",
        "- Funções: `gerarUrlUpload()`, `gerarUrlDownload()`, `uploadObjeto()`, `downloadObjeto()`, `removerObjeto()`, `existeObjeto()`, `listarObjetos()`",
        "- Imagens: guardar a **key** no banco; na API, gerar presigned URL com `gerarUrlDownload(key, 900)`",
        `- Upload: gerar key no backend (\`"prefixo/\${crypto.randomUUID()}"\`), retornar com \`gerarUrlUpload(key, contentType, 900)\``,
      ].join("\n")
    );
    log.success("Documentação adicionada ao infra.md");
  },
};

import { resolve } from "node:path";
import { log, spinner } from "@clack/prompts";
import { $ } from "bun";
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

    const s = spinner();
    s.start("Instalando dependências...");
    const resultado =
      await $`bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
        .cwd(resolve(root, "packages/infra"))
        .nothrow()
        .quiet();
    if (resultado.exitCode !== 0) {
      s.stop("Falha ao instalar dependências");
      log.error(
        "Execute manualmente: bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --cwd packages/infra"
      );
    } else {
      s.stop("Dependências instaladas");
    }

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
        "- Funções: `gerarUrlUpload()`, `gerarUrlDownload()`, `removerObjeto()`, `listarObjetos()`",
        "- Imagens: guardar a **key** no banco; na API, gerar presigned URL com `gerarUrlDownload(key, 900)`",
        `- Upload: gerar key no backend (\`"prefixo/\${crypto.randomUUID()}"\`), retornar com \`gerarUrlUpload(key, contentType, 900)\``,
      ].join("\n")
    );
    log.success("Documentação adicionada ao infra.md");
  },
};

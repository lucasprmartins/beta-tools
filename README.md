<div align="center">

<img src="https://raw.githubusercontent.com/lucasprmartins/beta/main/apps/web/public/logo-1.svg" alt="Beta" width="80" />

# Beta Tools

**Ferramentas reutilizáveis para projetos que usam n8n e/ou Storage S3.**

Copie apenas o que precisar para o seu projeto.

[n8n](#n8n) · [Storage S3](#storage-s3) · [Como integrar](#como-integrar)

</div>

---

## n8n

### Client (`n8n/client.ts`)

Classe tipada para chamar webhooks do n8n em runtime.

```ts
import { N8n } from "./n8n/client";

const n8n = new N8n("https://n8n.exemplo.com/webhook", "token-opcional");

// Definir workflows tipados
const workflows = {
  compraRealizada: n8n.path<CompraPayload>("/compra-realizada"),
  gerarRelatorio: n8n.path<RelatorioPayload, RelatorioResposta>("/gerar-relatorio"),
};

// Fire-and-forget (sem retorno)
await workflows.compraRealizada.workflow(payload, false);

// Com retorno tipado
const resultado = await workflows.gerarRelatorio.workflow(payload, true);
```

**Dependências:** nenhuma (usa `fetch` nativo).

### CLI de Sync (`n8n/pull.ts` e `n8n/push.ts`)

Sincroniza workflows entre o n8n remoto e arquivos JSON locais, usando tags para filtrar.

**Dependências:** nenhuma (usa `fetch` nativo).

#### Configuração

Crie um arquivo `n8n/.env`:

```env
N8N_URL=https://n8n.exemplo.com
N8N_API_KEY=sua-api-key
N8N_PROJECT_TAG=meu-projeto
```

Ou defina as variáveis via `process.env`.

#### Comandos

```bash
# Baixar workflows do n8n para n8n/workflows/
bun n8n/pull.ts

# Enviar workflows locais para o n8n
bun n8n/push.ts
```

O `pull` busca todos os workflows com a tag configurada e salva como JSON em `n8n/workflows/`. O `push` compara por nome — cria novos ou atualiza existentes.

#### Estrutura gerada

```
n8n/
├── .env              # Credenciais (não commitar)
├── workflows/        # JSONs dos workflows (commitar)
│   ├── compra-realizada.json
│   └── gerar-relatorio.json
├── shared.ts
├── pull.ts
└── push.ts
```

---

## Storage S3

### Client (`storage/client.ts`)

Funções para presigned URLs, remoção e listagem de objetos S3. Compatível com AWS S3, Cloudflare R2 e MinIO.

```ts
import {
  gerarUrlUpload,
  gerarUrlDownload,
  removerObjeto,
  listarObjetos,
  type StorageConfig,
} from "./storage/client";

const config: StorageConfig = {
  endpoint: "https://s3.exemplo.com",
  region: "auto",
  accessKeyId: "...",
  secretAccessKey: "...",
  bucket: "meu-bucket",
};

// Gerar URL de upload (PUT) — expira em 15min
const urlUpload = await gerarUrlUpload(config, "fotos/avatar.jpg", "image/jpeg", 900);

// Gerar URL de download (GET) — expira em 15min
const urlDownload = await gerarUrlDownload(config, "fotos/avatar.jpg", 900);

// Remover objeto
await removerObjeto(config, "fotos/avatar.jpg");

// Listar objetos por prefixo
const objetos = await listarObjetos(config, "fotos/");
```

**Dependências:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.

### CORS (`storage/cors.ts`)

Configura CORS no bucket S3 para permitir uploads diretos do browser.

```ts
import { configurarCors } from "./storage/cors";

await configurarCors({
  endpoint: "https://s3.exemplo.com",
  region: "auto",
  accessKeyId: "...",
  secretAccessKey: "...",
  bucket: "meu-bucket",
  origins: ["https://app.exemplo.com"],
});
```

**Dependências:** `@aws-sdk/client-s3`.

---

## Como integrar

### n8n

Copie a pasta `n8n/` para o seu projeto. Sem dependências externas.

### Storage S3

Copie a pasta `storage/` para o seu projeto e instale as dependências:

```bash
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Resumo de dependências

| Ferramenta | Dependências |
|------------|-------------|
| `n8n/client.ts` | Nenhuma |
| `n8n/pull.ts` / `n8n/push.ts` | Nenhuma |
| `storage/client.ts` | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |
| `storage/cors.ts` | `@aws-sdk/client-s3` |

As ferramentas são desacopladas — não dependem de framework, logger ou estrutura de env específica.

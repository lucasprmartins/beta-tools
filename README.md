<div align="center">

<p>
  <img src="https://raw.githubusercontent.com/lucasprmartins/beta/main/apps/web/public/logo-1.svg" alt="Beta" height="70" align="center" />
  &nbsp;&nbsp;
  <img src="https://img.shields.io/badge/tools-7c3aed?style=for-the-badge" alt="Tools" height="28" align="center" />
</p>

[![GitHub](https://img.shields.io/badge/Template-Beta-7c3aed?logo=github)](https://github.com/lucasprmartins/beta)

</div>

---

## Uso

```bash
bun beta
```

Selecione as integrações desejadas e o CLI copia os arquivos, instala dependências e configura o projeto automaticamente.

## Integrações

| Integração | Descrição | Deps extras |
|------------|-----------|-------------|
| **n8n** | Client tipado para webhooks + CLI de sync (pull/push) de workflows | Nenhuma |
| **Storage** | Presigned URLs, remoção e listagem S3 (AWS, R2, MinIO) + CORS | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` |

## Pré-requisitos

- [Beta](https://github.com/lucasprmartins/beta) clonado ao lado de `beta-tools/`
- `bun install` executado neste repositório

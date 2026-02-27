interface WorkflowHandler<TPayload, TResposta = void> {
  workflow(payload: TPayload, retorno: false): Promise<void>;
  workflow(payload: TPayload, retorno: true): Promise<TResposta>;
  workflow(payload: TPayload, retorno: boolean): Promise<TResposta | undefined>;
}

export class N8n {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  path<TPayload>(path: string): WorkflowHandler<TPayload>;
  path<TPayload, TResposta>(path: string): WorkflowHandler<TPayload, TResposta>;
  path<TPayload, TResposta = void>(
    path: string
  ): WorkflowHandler<TPayload, TResposta> {
    const url = `${this.baseUrl}${path}`;
    const token = this.token;

    return {
      async workflow(payload: TPayload, retorno: boolean) {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`n8n webhook falhou: ${response.status} ${body}`);
        }

        if (retorno) {
          return (await response.json()) as TResposta;
        }
      },
    } as WorkflowHandler<TPayload, TResposta>;
  }
}

// Exemplo de uso:
// const n8n = new N8n("https://n8n.exemplo.com/webhook", "token-opcional");
//
// const workflows = {
//   compraRealizada: n8n.path<CompraPayload>("/compra-realizada"),
//   gerarRelatorio: n8n.path<RelatorioPayload, RelatorioResposta>("/gerar-relatorio"),
// };
//
// await workflows.compraRealizada.workflow(payload, false); // fire-and-forget
// const resultado = await workflows.gerarRelatorio.workflow(payload, true); // com retorno

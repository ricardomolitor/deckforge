// ============================================
// MCP Client Service — Integração Cockpit BR (JSON-RPC 2.0)
// ============================================

/**
 * Client MCP para integração com o Cockpit BR via JSON-RPC 2.0.
 *
 * Usa o mesmo padrão do avanade-offer-agent:
 *   POST COCKPIT_MCP_URL → { jsonrpc: "2.0", method: "tools/call", params: { name: "execute_agent", arguments: { user_input } } }
 *
 * O Cockpit BR já possui a LLM conectada (Azure OpenAI / GPT).
 * O custo da LLM é direcionado para a subscription do Cockpit.
 */

interface McpCompletionRequest {
  prompt: string;
  context?: Record<string, unknown>;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface McpCompletionResponse {
  answer: string;
  metadata: {
    model: string;
    tokensUsed: number;
    latencyMs: number;
  };
}

interface CockpitMcpConfig {
  url: string;
  headers: Record<string, string>;
}

// ─── Cockpit MCP Config ─────────────────────────────────────

function getCockpitConfig(): CockpitMcpConfig | null {
  const url = process.env.COCKPIT_MCP_URL;
  const apiKey = process.env.COCKPIT_MCP_API_KEY;
  const cockpitApiKey = process.env.COCKPIT_API_KEY;
  const licenseId = process.env.COCKPIT_LICENSE_ID;
  const namespaceId = process.env.COCKPIT_NAMESPACE_ID;
  const utilityAgentId = process.env.COCKPIT_UTILITY_AGENT_ID;

  if (!url || !apiKey || !cockpitApiKey) {
    console.error('[MCP] Configuração incompleta — COCKPIT_MCP_URL, COCKPIT_MCP_API_KEY e COCKPIT_API_KEY são obrigatórios.');
    return null;
  }

  return {
    url,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-api-key': apiKey,
      'x-cockpit-api-key': cockpitApiKey,
      'x-cockpit-license-id': licenseId || '',
      'x-cockpit-namespace-id': namespaceId || '',
      'x-cockpit-utility-agent-id': utilityAgentId || '',
    },
  };
}

// ─── Parse MCP Response (formato aninhado do Cockpit) ────────

function parseMcpResponse(data: any): string {
  // Handle JSON-RPC error
  if (data.error) {
    throw new Error(`MCP JSON-RPC error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const result = data.result;

  // Extract text from result
  let resultText = '';
  if (typeof result === 'string') {
    resultText = result;
  } else if (result?.content && Array.isArray(result.content)) {
    const textItems = result.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text);
    resultText = textItems.join('\n');
  } else if (result?.text) {
    resultText = result.text;
  } else {
    resultText = JSON.stringify(result);
  }

  // Handle nested format: { type: "ai", content: "<escaped JSON>" }
  try {
    const outerJson = JSON.parse(resultText);

    if (outerJson.error) {
      throw new Error(`Agent error: ${outerJson.message || outerJson.error}`);
    }

    // Nested format: content is escaped JSON string
    if (outerJson.type === 'ai' && typeof outerJson.content === 'string') {
      // Check if the inner content is an error response from the backend
      try {
        const innerJson = JSON.parse(outerJson.content);
        if (innerJson.error) {
          throw new Error(`Agent backend error: ${innerJson.message || innerJson.error}`);
        }
      } catch (innerErr) {
        // If the inner parse threw due to error detection, re-throw it
        if ((innerErr as Error).message.startsWith('Agent backend error:')) {
          throw innerErr;
        }
        // Otherwise inner content is not JSON or not an error — that's fine
      }
      return outerJson.content;
    }

    // Direct JSON response
    if (typeof outerJson === 'object' && !outerJson.type) {
      return JSON.stringify(outerJson);
    }

    return resultText;
  } catch (parseErr) {
    // If the error was explicitly detected, re-throw for retry
    if ((parseErr as Error).message.includes('Agent') && (parseErr as Error).message.includes('error')) {
      throw parseErr;
    }
    // Not JSON, return raw text
    return resultText;
  }
}

// ─── MCP Client Service ─────────────────────────────────────

class McpClientService {
  private maxRetries = 2;
  private timeout = 180_000; // 180s — exec report prompts são pesados

  /**
   * Verifica se o Cockpit BR está configurado.
   */
  isConfigured(): boolean {
    return getCockpitConfig() !== null;
  }

  /**
   * Envia um prompt ao Cockpit BR via MCP JSON-RPC 2.0 (execute_agent).
   * Implementa retry com backoff exponencial.
   */
  async requestCompletion(request: McpCompletionRequest): Promise<McpCompletionResponse> {
    const config = getCockpitConfig();
    if (!config) {
      throw new Error(
        'Cockpit BR não configurado. Defina COCKPIT_MCP_URL, COCKPIT_MCP_API_KEY e COCKPIT_API_KEY no .env.local'
      );
    }

    // Truncar prompt se necessário (limite ~15k chars no execute_agent)
    const userInput =
      request.prompt.length > 14_000
        ? request.prompt.substring(0, 14_000) + '\n[... conteúdo truncado para caber no limite ...]'
        : request.prompt;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        console.log(
          `[MCP] Enviando requisição ao Cockpit BR (attempt ${attempt + 1}/${this.maxRetries + 1}, ${userInput.length} chars)...`
        );

        const response = await fetch(config.url, {
          method: 'POST',
          headers: config.headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'tools/call',
            params: {
              name: 'execute_agent',
              arguments: { user_input: userInput },
            },
            id: Date.now(),
          }),
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`MCP HTTP ${response.status}: ${response.statusText} — ${body.substring(0, 200)}`);
        }

        const data = await response.json();
        const latencyMs = Date.now() - startTime;

        // Parse nested MCP response
        const answer = parseMcpResponse(data);

        console.log(`[MCP] ✅ Resposta recebida em ${latencyMs}ms (${answer.length} chars)`);

        // Extract model name from response metadata if available
        let modelName = 'cockpit-br';
        try {
          const parsed = JSON.parse(answer);
          if (parsed.response_metadata?.model_name) {
            modelName = parsed.response_metadata.model_name;
          }
        } catch {
          // answer may not be JSON, that's ok
        }

        return {
          answer,
          metadata: {
            model: modelName,
            tokensUsed: 0, // Cockpit doesn't expose this
            latencyMs,
          },
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`[MCP] ❌ Attempt ${attempt + 1} failed:`, (error as Error).message);

        if (attempt < this.maxRetries) {
          const delay = Math.min(2000 * Math.pow(2, attempt), 10_000);
          console.log(`[MCP] Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    throw new Error(
      `Cockpit BR falhou após ${this.maxRetries + 1} tentativas: ${lastError?.message}`
    );
  }

  /**
   * Verifica se o Cockpit BR está acessível.
   */
  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const config = getCockpitConfig();
    if (!config) {
      return { ok: false, latencyMs: 0, error: 'Cockpit BR não configurado' };
    }

    try {
      const startTime = Date.now();

      // Envia um prompt simples para testar conexão
      const response = await fetch(config.url, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'execute_agent',
            arguments: { user_input: 'Responda apenas: OK' },
          },
          id: Date.now(),
        }),
        signal: AbortSignal.timeout(15_000),
      });

      const latencyMs = Date.now() - startTime;
      return { ok: response.ok, latencyMs };
    } catch (error) {
      return { ok: false, latencyMs: 0, error: (error as Error).message };
    }
  }
}

// Singleton instance
export const mcpClient = new McpClientService();
export type { McpCompletionRequest, McpCompletionResponse };

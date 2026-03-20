import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';

/**
 * POST /api/llm/complete
 *
 * Endpoint que recebe prompt e contexto do frontend e envia ao
 * Cockpit BR via MCP para obter completions de LLM.
 *
 * Conforme documento de arquitetura (seção 6.1):
 * - Valida payload
 * - Normaliza para formato MCP
 * - Aciona McpClientService
 * - Devolve JSON normalizado ao frontend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate payload
    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json(
        { error: 'Campo "prompt" é obrigatório e deve ser uma string.' },
        { status: 400 }
      );
    }

    // Prompt size limit (protect Cockpit BR from abuse)
    if (body.prompt.length > 10000) {
      return NextResponse.json(
        { error: 'O prompt excede o tamanho máximo permitido (10.000 caracteres).' },
        { status: 400 }
      );
    }

    const result = await mcpClient.requestCompletion({
      prompt: body.prompt,
      context: body.context || {},
      model: body.model,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
    });

    return NextResponse.json({
      answer: result.answer,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('[API /llm/complete] Error:', error);

    return NextResponse.json(
      {
        error: 'Falha ao processar a requisição LLM. Tente novamente.',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 502 }
    );
  }
}

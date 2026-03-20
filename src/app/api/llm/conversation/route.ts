import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';

/**
 * POST /api/llm/conversation
 *
 * Endpoint para manter conversações (múltiplas turns) com LLM via Cockpit BR.
 * Recebe o histórico da conversa e envia ao MCP.
 */

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: 'Campo "messages" é obrigatório e deve ser um array não vazio.' },
        { status: 400 }
      );
    }

    // Build prompt from conversation history
    const messages: ConversationMessage[] = body.messages;
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'A última mensagem deve ser do role "user".' },
        { status: 400 }
      );
    }

    const result = await mcpClient.requestCompletion({
      prompt: lastMessage.content,
      context: {
        conversationHistory: messages.slice(0, -1),
        workshopContext: body.workshopContext || {},
      },
      model: body.model,
      maxTokens: body.maxTokens,
      temperature: body.temperature,
    });

    return NextResponse.json({
      message: {
        role: 'assistant' as const,
        content: result.answer,
      },
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('[API /llm/conversation] Error:', error);

    return NextResponse.json(
      {
        error: 'Falha ao processar a requisição de conversação. Tente novamente.',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 502 }
    );
  }
}

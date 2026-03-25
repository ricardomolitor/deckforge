import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';
import { buildAgentPrompt, AGENT_PIPELINE, type AgentId } from '@/lib/agents';

export const maxDuration = 300; // 5 min max for complex agent prompts
export const dynamic = 'force-dynamic';

/**
 * POST /api/agents/run
 *
 * Executa um único agente do pipeline via Cockpit BR MCP (JSON-RPC 2.0).
 * O frontend orquestra a sequência, chamando agente por agente.
 * Isso permite atualizar a UI em tempo real entre cada step.
 *
 * NÃO há fallback para mock/demo — se o Cockpit BR falhar, retorna erro real.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { agentId, project, previousOutputs } = body as {
      agentId: AgentId;
      project: {
        title: string;
        category: string;
        briefing: string;
        audience: string;
        tone: string;
        duration: number;
        references?: string;
      };
      previousOutputs: Record<string, string>;
    };

    // Validate agent
    if (!agentId || !AGENT_PIPELINE.includes(agentId)) {
      return NextResponse.json(
        { error: `Agente inválido: ${agentId}. Válidos: ${AGENT_PIPELINE.join(', ')}` },
        { status: 400 }
      );
    }

    if (!project?.briefing) {
      return NextResponse.json(
        { error: 'Briefing é obrigatório.' },
        { status: 400 }
      );
    }

    // Check if Cockpit BR is configured
    if (!mcpClient.isConfigured()) {
      return NextResponse.json(
        {
          error: 'Cockpit BR não configurado. Defina COCKPIT_MCP_URL, COCKPIT_MCP_API_KEY e COCKPIT_API_KEY no .env.local',
          code: 'MCP_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    // Build prompt for this specific agent
    const prompt = buildAgentPrompt(agentId, project as any, previousOutputs || {});

    console.log(`[API /agents/run] Executando agente "${agentId}" via Cockpit BR MCP (${prompt.length} chars)...`);

    // Call LLM via Cockpit BR MCP (execute_agent)
    const result = await mcpClient.requestCompletion({
      prompt,
      context: {
        agent: agentId,
        project_title: project.title,
        category: project.category,
      },
      maxTokens: 4096,
      temperature: agentId === 'researcher' ? 0.3 : agentId === 'copywriter' ? 0.8 : 0.6,
    });

    console.log(`[API /agents/run] ✅ Agente "${agentId}" respondeu em ${result.metadata.latencyMs}ms`);

    // Try to extract clean JSON from the response
    let cleanOutput = result.answer;
    try {
      // If the answer is a JSON string, try to parse and re-stringify for consistency
      const parsed = JSON.parse(cleanOutput);

      // Safety check: if the LLM/backend returned an error object inside a "successful" response
      if (parsed.error && (typeof parsed.error === 'string') && !parsed.slide_plan && !parsed.slides) {
        console.error(`[API /agents/run] ⚠️ Agent returned error in output: ${parsed.error}`);
        return NextResponse.json(
          {
            error: `Agente retornou erro do backend: ${parsed.message || parsed.error}`,
            code: 'MCP_BACKEND_ERROR',
          },
          { status: 502 }
        );
      }

      cleanOutput = JSON.stringify(parsed);
    } catch {
      // Response may contain markdown code fences or extra text — try to extract JSON
      const jsonMatch = cleanOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          cleanOutput = JSON.stringify(parsed);
        } catch {
          // Keep raw answer
        }
      }
    }

    return NextResponse.json({
      agentId,
      output: cleanOutput,
      metadata: result.metadata,
    });
  } catch (error) {
    const errorMessage = (error as Error).message || 'Erro desconhecido';
    console.error('[API /agents/run] ❌ Error:', errorMessage);

    // Return real error — no mock fallback
    return NextResponse.json(
      {
        error: `Falha ao executar agente: ${errorMessage}`,
        code: 'MCP_ERROR',
      },
      { status: 502 }
    );
  }
}

import { NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';

/**
 * GET /api/agents/health
 *
 * Verifica se o Cockpit BR está configurado e acessível.
 * Usado pelo frontend para mostrar status da conexão.
 */
export async function GET() {
  const configured = mcpClient.isConfigured();

  if (!configured) {
    return NextResponse.json({
      status: 'not_configured',
      message: 'Cockpit BR não configurado. Defina COCKPIT_MCP_URL, COCKPIT_MCP_API_KEY e COCKPIT_API_KEY no .env.local',
    }, { status: 503 });
  }

  const health = await mcpClient.healthCheck();

  return NextResponse.json({
    status: health.ok ? 'healthy' : 'unhealthy',
    latencyMs: health.latencyMs,
    error: health.error || undefined,
  }, { status: health.ok ? 200 : 502 });
}

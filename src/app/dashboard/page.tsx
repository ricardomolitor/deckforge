'use client';

import AppLayout from '@/components/layout/AppLayout';
import { useForgeStore } from '@/lib/forge-store';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge } from '@/components/ui';
import {
  Zap,
  Clock,
  Sparkles,
  ArrowRight,
  Monitor,
} from 'lucide-react';
import { AGENTS, AGENT_PIPELINE } from '@/lib/agents';

// Quick-start prompts
const QUICK_STARTS = [
  {
    emoji: '📊',
    title: 'Relatório Executivo',
    description: 'Business case estruturado',
    prompt: 'Relatório executivo com business case. Para cada caso/hipótese, gerar slide estruturado com: Problema + Hipótese testada, Solução (resultado tangível + intangível), Objetivo, Business Case completo (Investimento Total CAPEX+OPEX, VPL, ROI acumulado 5 anos, TIR, Payback Simples, Payback Descontado), e Potencial de Impacto (Aumento Receita %, Redução Custo %, Eficiência Operacional %). Usar template PPTX enviado como referência.',
    category: 'relatorio-executivo',
    duration: 15,
  },
  {
    emoji: '💼',
    title: 'Business Case',
    description: 'Justifique o investimento com ROI',
    prompt: 'Business Case Executivo completo. Apresentar: contexto e problema de negócio com indicadores críticos, tese da solução com 3 impactos quantificados, base econômica com benchmarks de mercado (tabela de premissas), impacto financeiro anual com cálculos detalhados dos 3 principais benefícios, e waterfall de 3 anos com payback, NPV e ROI. Formato monetário brasileiro (R$). Horizonte de 3 anos.',
    category: 'business-case',
    duration: 15,
  },
  {
    emoji: '🎯',
    title: 'Apresentação Livre',
    description: 'IA cria tudo: gráficos, tabelas e layout',
    prompt: 'Crie uma apresentação profissional completa sobre o tema que vou descrever. A IA deve decidir autonomamente: quantos slides usar, quais layouts aplicar (texto, gráficos de barra/pizza/linha, tabelas, comparações, dashboards de KPIs), e como organizar a narrativa. Incluir dados visuais sempre que possível. Descreva o tema/contexto:',
    category: 'apresentacao-livre',
    duration: 15,
  },
];

export default function DashboardPage() {
  const { projects } = useForgeStore();
  const router = useRouter();

  const totalProjects = projects.length;
  const completedProjects = projects.filter((p) => p.status === 'done').length;
  const totalSlides = projects.reduce((sum, p) => sum + p.slides.length, 0);

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 dark:bg-brand-900/40 px-4 py-1.5 text-sm font-medium text-brand-700 dark:text-brand-300">
            <Sparkles className="h-4 w-4" /> Powered by 7 AI Agents
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            O que vamos <span className="text-[#FF5800]">forjar</span> hoje?
          </h1>
          <p className="mx-auto max-w-lg text-gray-500 dark:text-gray-400">
            Descreva em linguagem natural. Nossos agentes fazem o resto.
          </p>

          {/* Main CTA */}
          <div className="pt-2">
            <Button
              size="lg"
              onClick={() => router.push('/forge')}
              className="bg-[#FF5800] hover:bg-[#E04E00] shadow-lg shadow-[#FF5800]/20 px-10 text-base"
            >
              <Zap className="h-5 w-5" />
              Iniciar no Forge
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {totalProjects > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalProjects}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Projetos criados</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedProjects}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Apresentações geradas</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{totalSlides}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Slides criados</p>
            </Card>
          </div>
        )}

        {/* Quick Start Templates */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Comece rápido</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push('/forge')}>
              Criar do zero <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_STARTS.map((qs) => (
              <button
                key={qs.title}
                onClick={() => router.push(`/forge?prompt=${encodeURIComponent(qs.prompt)}&cat=${qs.category}&dur=${qs.duration}`)}
                className="group flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-nero-600 bg-white dark:bg-nero-800 p-5 text-left transition-all hover:border-brand-300 dark:hover:border-brand-500 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{qs.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400">{qs.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{qs.description}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mt-1">{qs.prompt}</p>
                <div className="flex items-center gap-1 text-[11px] text-brand-600 font-medium mt-auto pt-2">
                  Usar template <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Agent Showcase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nossos 7 Agentes IA</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">Pipeline sequencial</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AGENT_PIPELINE.map((agentId, idx) => {
              const agent = AGENTS[agentId];
              return (
                <div
                  key={agentId}
                  className="group relative flex flex-col gap-3 rounded-xl border-2 border-gray-200 dark:border-nero-600 bg-white dark:bg-nero-800 p-5 transition-all hover:border-brand-300 dark:hover:border-brand-500 hover:shadow-md"
                >
                  {/* Step number badge */}
                  <div className="absolute -top-2.5 -left-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF5800] text-[10px] font-bold text-white shadow-sm">
                    {idx + 1}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${agent.bgColor} text-xl`}>
                      {agent.emoji}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{agent.name}</p>
                      <p className={`text-[11px] font-medium ${agent.color}`}>{agent.role}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{agent.description}</p>
                  {/* Connection arrow (except last) */}
                  {idx < AGENT_PIPELINE.length - 1 && (
                    <div className="absolute -right-3 top-1/2 -translate-y-1/2 hidden lg:block text-gray-300">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Projetos Recentes</h2>
            <div className="space-y-2">
              {projects.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push('/forge')}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 dark:border-nero-600 bg-white dark:bg-nero-800 px-5 py-4 text-left transition-all hover:border-brand-300 dark:hover:border-brand-500 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.title}</p>
                      <Badge variant={p.status === 'done' ? 'success' : 'default'}>
                        {p.status === 'done' ? '✅ Gerado' : p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {p.duration}min</span>
                      <span className="flex items-center gap-1"><Monitor className="h-3 w-3" /> {p.slides.length} slides</span>
                      <span>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

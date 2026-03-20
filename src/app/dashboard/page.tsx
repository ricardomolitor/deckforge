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
    emoji: '🎯',
    title: 'Pitch Executivo',
    description: 'Convença o board em 15 minutos',
    prompt: 'Pitch executivo para convencer o board a aprovar investimento em nova plataforma digital. Audiência: CEO, CFO, CTO. Foco em ROI e time-to-market.',
    category: 'pitch',
    duration: 15,
  },
  {
    emoji: '💰',
    title: 'Proposta Comercial',
    description: 'Destaque-se na concorrência',
    prompt: 'Apresentação de proposta comercial para projeto de transformação digital. Mostrar credenciais, abordagem, timeline e investimento. Tom consultivo.',
    category: 'proposta',
    duration: 30,
  },
  {
    emoji: '🎓',
    title: 'Treinamento',
    description: 'Capacite em 2 horas',
    prompt: 'Material para treinamento técnico de meio dia sobre boas práticas de arquitetura cloud. Audiência: desenvolvedores senior. Tom educativo com exercícios.',
    category: 'treinamento',
    duration: 120,
  },
  {
    emoji: '🧑‍🤝‍🧑',
    title: 'Workshop Discovery',
    description: 'Estruture uma sessão épica',
    prompt: 'Material para workshop de discovery com cliente do setor financeiro. Mapear dores, oportunidades e co-criar soluções. 1 dia, 15 participantes.',
    category: 'workshop',
    duration: 480,
  },
  {
    emoji: '🚀',
    title: 'Demo de Produto',
    description: 'Wow em 10 minutos',
    prompt: 'Apresentação para demo de produto SaaS para prospect enterprise. Mostrar valor do produto, diferencial competitivo e resultados de clientes reais.',
    category: 'venda',
    duration: 10,
  },
  {
    emoji: '📊',
    title: 'Resultado Trimestral',
    description: 'Reporte com impacto',
    prompt: 'Apresentação de resultados do Q1 para stakeholders internos. Métricas de performance, conquistas, desafios e plano para Q2. Tom executivo.',
    category: 'outro',
    duration: 30,
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
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-100 to-purple-100 px-4 py-1.5 text-sm font-medium text-brand-700">
            <Sparkles className="h-4 w-4" /> Powered by 6 AI Agents
          </div>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            O que vamos <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">forjar</span> hoje?
          </h1>
          <p className="mx-auto max-w-lg text-gray-500">
            Descreva em linguagem natural. Nossos agentes fazem o resto.
          </p>

          {/* Main CTA */}
          <div className="pt-2">
            <Button
              size="lg"
              onClick={() => router.push('/forge')}
              className="bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 shadow-lg shadow-brand-500/25 px-10 text-base"
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
              <p className="text-2xl font-bold text-gray-900">{totalProjects}</p>
              <p className="text-xs text-gray-500">Projetos criados</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{completedProjects}</p>
              <p className="text-xs text-gray-500">Apresentações geradas</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{totalSlides}</p>
              <p className="text-xs text-gray-500">Slides criados</p>
            </Card>
          </div>
        )}

        {/* Quick Start Templates */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Comece rápido</h2>
            <Button variant="ghost" size="sm" onClick={() => router.push('/forge')}>
              Criar do zero <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {QUICK_STARTS.map((qs) => (
              <button
                key={qs.title}
                onClick={() => router.push(`/forge?prompt=${encodeURIComponent(qs.prompt)}&cat=${qs.category}&dur=${qs.duration}`)}
                className="group flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{qs.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-600">{qs.title}</p>
                    <p className="text-xs text-gray-500">{qs.description}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 mt-1">{qs.prompt}</p>
                <div className="flex items-center gap-1 text-[11px] text-brand-600 font-medium mt-auto pt-2">
                  Usar template <ArrowRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Agent Showcase */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Nossos Agentes</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AGENT_PIPELINE.map((agentId) => {
              const agent = AGENTS[agentId];
              return (
                <div
                  key={agentId}
                  className={`flex items-start gap-3 rounded-xl border ${agent.borderColor} ${agent.bgColor} p-4`}
                >
                  <span className="text-xl">{agent.emoji}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                    <p className="text-xs text-gray-600">{agent.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">Projetos Recentes</h2>
            <div className="space-y-2">
              {projects.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push('/forge')}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 text-left transition-all hover:border-brand-300 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.title}</p>
                      <Badge variant={p.status === 'done' ? 'success' : 'default'}>
                        {p.status === 'done' ? '✅ Gerado' : p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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

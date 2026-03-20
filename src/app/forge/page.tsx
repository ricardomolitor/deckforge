'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useForgeStore } from '@/lib/forge-store';
import { Button, Card, Badge, MessageBar } from '@/components/ui';
import {
  Zap,
  ArrowLeft,
  Send,
  ChevronRight,
  Download,
  RotateCcw,
  Eye,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Clock,
  Hash,
  MessageSquare,
  Lightbulb,
  Monitor,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  AGENTS,
  AGENT_PIPELINE,
  TONE_OPTIONS,
  AUDIENCE_SUGGESTIONS,
  DURATION_PRESETS,
  getProjectProgress,
  type AgentId,
  type ForgeProject,
  type SlideContent,
} from '@/lib/agents';
import type { PresentationCategory } from '@/lib/types';
import { PRESENTATION_CATEGORY_LABELS } from '@/lib/types';

// --- Agent Pipeline Runner (client-side orchestrator) ---
async function runAgentPipeline(
  project: ForgeProject,
  onAgentStart: (agentId: AgentId) => void,
  onAgentDone: (agentId: AgentId, output: string) => void,
  onAgentError: (agentId: AgentId, error: string) => void,
) {
  const outputs: Record<string, string> = {};

  for (const agentId of AGENT_PIPELINE) {
    onAgentStart(agentId);

    try {
      const res = await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          project: {
            title: project.title,
            category: project.category,
            briefing: project.briefing,
            audience: project.audience,
            tone: project.tone,
            duration: project.duration,
          },
          previousOutputs: outputs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao executar agente');
      }

      outputs[agentId] = data.output;
      onAgentDone(agentId, data.output);
    } catch (err: any) {
      onAgentError(agentId, err.message || 'Erro desconhecido');
      return; // stop pipeline on error
    }
  }
}

// --- Category options for briefing ---
const CATEGORY_OPTIONS: { value: PresentationCategory; label: string; emoji: string }[] = [
  { value: 'pitch', emoji: '🎯', label: 'Pitch' },
  { value: 'venda', emoji: '💰', label: 'Venda' },
  { value: 'proposta', emoji: '📋', label: 'Proposta' },
  { value: 'workshop', emoji: '🧑‍🤝‍🧑', label: 'Workshop' },
  { value: 'treinamento', emoji: '🎓', label: 'Treinamento' },
  { value: 'outro', emoji: '✨', label: 'Outro' },
];

// ==============================================
// FORGE PAGE — Hub Principal de Geração
// ==============================================

export default function ForgePage() {
  const router = useRouter();
  const store = useForgeStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Briefing form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PresentationCategory>('pitch');
  const [briefing, setBriefing] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('executivo');
  const [duration, setDuration] = useState(15);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Pipeline state
  const [activeProject, setActiveProject] = useState<ForgeProject | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<AgentId | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom when pipeline runs
  useEffect(() => {
    if (isRunning) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isRunning, activeProject?.agents]);

  const handleGenerate = useCallback(async () => {
    if (!briefing.trim()) return;

    const project = store.createProject({
      title: title || `${PRESENTATION_CATEGORY_LABELS[category]} — ${new Date().toLocaleDateString('pt-BR')}`,
      category,
      briefing,
      audience,
      tone,
      duration,
    });

    setActiveProject(project);
    setIsRunning(true);
    store.startPipeline(project.id);

    await runAgentPipeline(
      project,
      (agentId) => {
        store.setAgentStarted(project.id, agentId);
        setActiveProject((prev) => prev ? {
          ...prev,
          agents: prev.agents.map((a) =>
            a.agentId === agentId ? { ...a, status: 'running', startedAt: Date.now() } : a
          ),
        } : null);
      },
      (agentId, output) => {
        store.setAgentDone(project.id, agentId, output);
        setActiveProject((prev) => {
          if (!prev) return null;
          const updated = {
            ...prev,
            agents: prev.agents.map((a) =>
              a.agentId === agentId ? { ...a, status: 'done' as const, output, finishedAt: Date.now() } : a
            ),
          };

          // Parse slides from copywriter output
          if (agentId === 'copywriter') {
            try {
              const parsed = JSON.parse(output);
              if (parsed.slides) {
                const slides: SlideContent[] = parsed.slides.map((s: any, i: number) => ({
                  id: `slide-${i}`,
                  order: s.order ?? i,
                  title: s.title || '',
                  subtitle: s.subtitle || '',
                  bullets: s.bullets || [],
                  speakerNotes: '',
                  visualSuggestion: '',
                  layoutType: i === 0 ? 'title' : i === parsed.slides.length - 1 ? 'closing' : 'content',
                  duration: 60,
                }));
                updated.slides = slides;
                store.setSlides(project.id, slides);
              }
            } catch { /* skip parse errors */ }
          }

          // Merge slide-architect layouts into existing slides
          if (agentId === 'slide-architect' && updated.slides.length > 0) {
            try {
              const parsed = JSON.parse(output);
              if (parsed.slides) {
                const enriched = updated.slides.map((slide) => {
                  const arch = parsed.slides.find((a: any) => a.order === slide.order);
                  if (arch) {
                    return {
                      ...slide,
                      layoutType: arch.layout_type || slide.layoutType,
                      visualSuggestion: arch.visual_suggestion || slide.visualSuggestion,
                    };
                  }
                  return slide;
                });
                updated.slides = enriched;
                store.setSlides(project.id, enriched);
              }
            } catch { /* skip */ }
          }

          // Merge storyteller speaker notes into existing slides
          if (agentId === 'storyteller' && updated.slides.length > 0) {
            try {
              const parsed = JSON.parse(output);
              if (parsed.slides) {
                const enriched = updated.slides.map((slide) => {
                  const story = parsed.slides.find((s: any) => s.order === slide.order);
                  if (story) {
                    return {
                      ...slide,
                      speakerNotes: story.speaker_notes || slide.speakerNotes,
                      duration: story.duration_seconds || slide.duration,
                    };
                  }
                  return slide;
                });
                updated.slides = enriched;
                store.setSlides(project.id, enriched);
              }
            } catch { /* skip */ }
          }

          // Parse key messages from strategist
          if (agentId === 'strategist') {
            try {
              const parsed = JSON.parse(output);
              if (parsed.key_messages) {
                updated.keyMessages = parsed.key_messages;
                store.setKeyMessages(project.id, parsed.key_messages);
              }
              if (parsed.narrative_arc) {
                updated.narrative = parsed.narrative_arc;
                store.setNarrative(project.id, parsed.narrative_arc);
              }
            } catch { /* skip */ }
          }

          // Parse research insights
          if (agentId === 'researcher') {
            try {
              const parsed = JSON.parse(output);
              if (parsed.insights) {
                const insights = parsed.insights.map((i: any) => `${i.fact} (${i.source})`);
                updated.researchInsights = insights;
                store.setResearchInsights(project.id, insights);
              }
            } catch { /* skip */ }
          }

          // Parse reviewer feedback
          if (agentId === 'reviewer') {
            try {
              const parsed = JSON.parse(output);
              updated.reviewFeedback = `Score: ${parsed.overall_score}/100 — ${parsed.final_verdict}`;
              store.setReviewFeedback(project.id, updated.reviewFeedback);
            } catch { /* skip */ }
          }

          return updated;
        });
      },
      (agentId, error) => {
        store.setAgentError(project.id, agentId, error);
        setActiveProject((prev) => prev ? {
          ...prev,
          status: 'error',
          agents: prev.agents.map((a) =>
            a.agentId === agentId ? { ...a, status: 'error', output: error } : a
          ),
        } : null);
      },
    );

    setIsRunning(false);
    store.setProjectStatus(project.id, 'done');
    setActiveProject((prev) => prev ? { ...prev, status: 'done' } : null);
  }, [briefing, title, category, audience, tone, duration, store]);

  const handleReset = () => {
    setActiveProject(null);
    setIsRunning(false);
    setBriefing('');
    setTitle('');
    setAudience('');
    setActiveSlide(0);
  };

  const handleViewProject = (project: ForgeProject) => {
    setActiveProject(project);
    setActiveSlide(0);
  };

  const handleCopySlides = () => {
    if (!activeProject?.slides?.length) return;
    const text = activeProject.slides.map((s, i) =>
      `=== Slide ${i + 1}: ${s.title} ===\n${s.subtitle ? s.subtitle + '\n' : ''}${s.bullets.map(b => `• ${b}`).join('\n')}${s.speakerNotes ? '\n\n[Speaker Notes] ' + s.speakerNotes : ''}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDone = activeProject?.status === 'done';
  const progress = activeProject ? getProjectProgress(activeProject) : 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">

        {/* === BRIEFING PHASE === */}
        {!activeProject && (
          <>
            {/* Hero */}
            <div className="text-center space-y-3 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-100 to-purple-100 px-4 py-1.5 text-sm font-medium text-brand-700">
                <Sparkles className="h-4 w-4" /> 6 Agentes IA trabalhando para você
              </div>
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Descreva. Nós <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">forjamos</span>.
              </h1>
              <p className="mx-auto max-w-xl text-gray-500">
                Descreva o que precisa em linguagem natural. Nossos agentes especializados criam a apresentação inteira em segundos.
              </p>
            </div>

            {/* Briefing Form */}
            <Card className="p-6 space-y-5">
              {/* Category Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Para que tipo de apresentação?</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCategory(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                        category === opt.value
                          ? 'border-brand-500 bg-brand-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 text-gray-500'
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="text-xs font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Briefing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descreva o que precisa <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                  placeholder="Ex.: Preciso de um pitch de 15 minutos para o board executivo da Acme sobre como IA generativa pode reduzir churn em 40%. A audiência é o CEO, CFO e CTO. Quero dados impactantes e um CTA claro para aprovar o PoC..."
                />
                <p className="mt-1 text-xs text-gray-400">{briefing.length}/2000 caracteres</p>
              </div>

              {/* Quick Settings */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Audiência</label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    list="audience-list"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    placeholder="Para quem é?"
                  />
                  <datalist id="audience-list">
                    {AUDIENCE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Duração</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {DURATION_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tom</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {TONE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Advanced toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Configurações avançadas
              </button>

              {showAdvanced && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Título (opcional)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      placeholder="Será gerado automaticamente se não informado"
                    />
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~30 segundos</span>
                  <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> 6 agentes</span>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!briefing.trim() || isRunning}
                  size="lg"
                  className="bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 shadow-lg shadow-brand-500/25 px-8"
                >
                  <Zap className="h-4 w-4" />
                  Forjar Apresentação
                </Button>
              </div>
            </Card>

            {/* Recent Projects */}
            {store.projects.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recentes</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {store.projects.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleViewProject(p)}
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-brand-300 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">
                          {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <Badge variant={p.status === 'done' ? 'success' : p.status === 'error' ? 'error' : 'default'}>
                          {p.status === 'done' ? 'Gerado' : p.status === 'error' ? 'Erro' : 'Rascunho'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{p.briefing}</p>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        <span>{p.slides.length} slides</span>
                        <span>{p.duration}min</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* === PIPELINE & RESULTS PHASE === */}
        {activeProject && (
          <>
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 line-clamp-1">{activeProject.title}</h1>
                  <p className="text-xs text-gray-500">{activeProject.briefing.slice(0, 80)}...</p>
                </div>
              </div>
              {isDone && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopySlides}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado!' : 'Copiar tudo'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" /> Novo
                  </Button>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isRunning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Agentes trabalhando...
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Agent Pipeline Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AGENT_PIPELINE.map((agentId) => {
                const agent = AGENTS[agentId];
                const state = activeProject.agents.find((a) => a.agentId === agentId);
                const isExpanded = expandedAgent === agentId;
                const status = state?.status || 'idle';

                return (
                  <button
                    key={agentId}
                    onClick={() => setExpandedAgent(isExpanded ? null : agentId)}
                    className={`flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                      status === 'running'
                        ? `${agent.borderColor} ${agent.bgColor} shadow-md animate-pulse`
                        : status === 'done'
                        ? 'border-green-200 bg-green-50'
                        : status === 'error'
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                          <p className="text-[11px] text-gray-500">{agent.role}</p>
                        </div>
                      </div>
                      {status === 'running' && <Loader2 className={`h-4 w-4 animate-spin ${agent.color}`} />}
                      {status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                      {status === 'idle' && <div className="h-4 w-4 rounded-full border-2 border-gray-300" />}
                    </div>

                    {isExpanded && state?.output && status === 'done' && (
                      <div className="mt-2 rounded-lg bg-white/80 p-3 text-xs text-gray-700 max-h-48 overflow-y-auto font-mono whitespace-pre-wrap border border-gray-200">
                        {state.output.slice(0, 500)}{state.output.length > 500 ? '...' : ''}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* === RESULTS: Slide Preview === */}
            {isDone && activeProject.slides.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Slides Gerados ({activeProject.slides.length})
                </h2>

                {/* Slide Navigator */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {activeProject.slides.map((slide, i) => (
                    <button
                      key={slide.id}
                      onClick={() => setActiveSlide(i)}
                      className={`flex-shrink-0 rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all ${
                        activeSlide === i
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {i + 1}. {slide.title.slice(0, 20)}{slide.title.length > 20 ? '...' : ''}
                    </button>
                  ))}
                </div>

                {/* Active Slide Preview */}
                {(() => {
                  const slide = activeProject.slides[activeSlide];
                  if (!slide) return null;
                  const layoutColors: Record<string, string> = {
                    title: 'from-gray-900 to-gray-800',
                    content: 'from-brand-600 to-brand-700',
                    'two-column': 'from-blue-600 to-blue-700',
                    data: 'from-emerald-600 to-emerald-700',
                    quote: 'from-purple-600 to-purple-700',
                    closing: 'from-brand-700 to-purple-700',
                    'section-break': 'from-gray-800 to-gray-900',
                  };
                  const gradient = layoutColors[slide.layoutType] || layoutColors.content;

                  return (
                    <div className="space-y-4">
                      {/* Slide Visual */}
                      <div className={`relative aspect-video max-w-3xl rounded-2xl bg-gradient-to-br ${gradient} p-8 sm:p-12 text-white shadow-2xl overflow-hidden`}>
                        {/* Background decoration */}
                        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
                          <div className="absolute top-8 right-8 w-32 h-32 rounded-full bg-white/20" />
                          <div className="absolute bottom-12 right-24 w-20 h-20 rounded-full bg-white/10" />
                        </div>

                        <div className="relative z-10 flex h-full flex-col justify-center">
                          <Badge variant="default" className="self-start mb-3 bg-white/20 text-white border-0 text-[10px]">
                            Slide {activeSlide + 1} / {activeProject.slides.length} — {slide.layoutType}
                          </Badge>
                          <h2 className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">{slide.title}</h2>
                          {slide.subtitle && (
                            <p className="text-sm sm:text-base text-white/80 mb-6">{slide.subtitle}</p>
                          )}
                          <ul className="space-y-2">
                            {slide.bullets.map((b, bi) => (
                              <li key={bi} className="flex items-start gap-2 text-sm sm:text-base text-white/90">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/60 shrink-0" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Slide number */}
                        <div className="absolute bottom-4 right-6 text-xs text-white/30 font-mono">
                          {String(activeSlide + 1).padStart(2, '0')}
                        </div>
                      </div>

                      {/* Slide Details */}
                      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
                        {slide.speakerNotes && (
                          <Card className="p-4">
                            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase mb-2">
                              <MessageSquare className="h-3.5 w-3.5" /> Speaker Notes
                            </h4>
                            <p className="text-sm text-gray-700">{slide.speakerNotes}</p>
                          </Card>
                        )}
                        {slide.visualSuggestion && (
                          <Card className="p-4">
                            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase mb-2">
                              <Eye className="h-3.5 w-3.5" /> Sugestão Visual
                            </h4>
                            <p className="text-sm text-gray-700">{slide.visualSuggestion}</p>
                          </Card>
                        )}
                      </div>

                      {/* Navigation */}
                      <div className="flex items-center justify-between max-w-3xl">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                          disabled={activeSlide === 0}
                        >
                          <ArrowLeft className="h-4 w-4" /> Anterior
                        </Button>
                        <span className="text-xs text-gray-400">
                          {activeSlide + 1} de {activeProject.slides.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveSlide(Math.min(activeProject.slides.length - 1, activeSlide + 1))}
                          disabled={activeSlide === activeProject.slides.length - 1}
                        >
                          Próximo <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* Key Messages & Review */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
                  {activeProject.keyMessages.length > 0 && (
                    <Card className="p-4">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase mb-3">
                        <Lightbulb className="h-3.5 w-3.5" /> Mensagens-Chave
                      </h4>
                      <ul className="space-y-2">
                        {activeProject.keyMessages.map((m, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{i + 1}</span>
                            {m}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {activeProject.researchInsights.length > 0 && (
                    <Card className="p-4">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase mb-3">
                        🔍 Dados & Insights
                      </h4>
                      <ul className="space-y-2">
                        {activeProject.researchInsights.map((m, i) => (
                          <li key={i} className="text-sm text-gray-700 border-l-2 border-purple-300 pl-3">{m}</li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {activeProject.reviewFeedback && (
                    <Card className="p-4">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase mb-3">
                        🔎 Avaliação do Reviewer
                      </h4>
                      <p className="text-sm text-gray-700">{activeProject.reviewFeedback}</p>
                    </Card>
                  )}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </>
        )}
      </div>
    </AppLayout>
  );
}

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
  Paperclip,
  Image,
  FileText,
  Trash2,
  X,
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
  type Attachment,
} from '@/lib/agents';
import type { PresentationCategory } from '@/lib/types';
import { PRESENTATION_CATEGORY_LABELS } from '@/lib/types';
import { exportToPptx, exportFromTemplate } from '@/lib/export-pptx';
import { parsePptxFile } from '@/lib/parse-pptx';

// --- Agent Pipeline Runner (client-side orchestrator with retry) ---
const MAX_RETRIES = 2;

async function callAgent(
  agentId: AgentId,
  project: ForgeProject,
  previousOutputs: Record<string, string>,
): Promise<{ output: string; metadata: any }> {
  let lastError = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Pipeline] Retrying ${agentId} (attempt ${attempt + 1})...`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }

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
            references: project.references || '',
          },
          previousOutputs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      return { output: data.output, metadata: data.metadata };
    } catch (err: any) {
      lastError = err.message || 'Erro desconhecido';
    }
  }

  throw new Error(lastError);
}

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
      const { output } = await callAgent(agentId, project, outputs);
      outputs[agentId] = output;
      onAgentDone(agentId, output);
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
  { value: 'sprint-review', emoji: '🔄', label: 'Sprint Review' },
  { value: 'sprint-planning', emoji: '📌', label: 'Planning' },
  { value: 'retro', emoji: '🪞', label: 'Retro' },
  { value: 'demo', emoji: '🖥️', label: 'Demo' },
  { value: 'kickoff', emoji: '🚀', label: 'Kickoff' },
  { value: 'workshop', emoji: '🧑‍🤝‍🧑', label: 'Workshop' },
  { value: 'treinamento', emoji: '🎓', label: 'Treinamento' },
  { value: 'daily', emoji: '☀️', label: 'Daily' },
  { value: 'relatorio-executivo', emoji: '📊', label: 'Rel. Executivo' },
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [parsingPptx, setParsingPptx] = useState(false);
  const [templatePptxBase64, setTemplatePptxBase64] = useState<string | null>(null);
  const [templateTextSummary, setTemplateTextSummary] = useState<string | null>(null);
  const [templateFileName, setTemplateFileName] = useState<string | null>(null);
  const [designSystem, setDesignSystem] = useState<{
    primary_color?: string;
    accent_color?: string;
    font_style?: string;
    visual_theme?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // --- File handling ---
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      // --- PPTX: store binary template + extract text structure (no preview) ---
      if (file.name.match(/\.pptx$/i)) {
        setParsingPptx(true);
        try {
          const buffer = await file.arrayBuffer();
          // Store raw PPTX binary as base64 for template-based export
          const rawBytes = new Uint8Array(buffer);
          let binary = '';
          for (let j = 0; j < rawBytes.length; j++) binary += String.fromCharCode(rawBytes[j]);
          setTemplatePptxBase64(btoa(binary));

          // Extract text structure for agent prompts (not shown in UI)
          const parsed = await parsePptxFile(buffer);
          setTemplateTextSummary(parsed.textSummary || null);
          setTemplateFileName(file.name);
        } catch (err) {
          console.error('Failed to parse PPTX:', err);
          setTemplatePptxBase64(null);
          setTemplateTextSummary(null);
          setTemplateFileName(null);
        } finally {
          setParsingPptx(false);
        }
        continue;
      }

      if (file.type.startsWith('image/')) {
        // Image: create thumbnail preview
        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newAttachments.push({
          id, name: file.name, type: 'image', size: file.size,
          preview, caption: '',
        });
      } else {
        // Text/doc: read content
        const content = await file.text().catch(() => '');
        newAttachments.push({
          id, name: file.name,
          type: file.name.match(/\.(txt|md|csv)$/i) ? 'text' : 'document',
          size: file.size, content: content.slice(0, 20_000), caption: '',
        });
      }
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const updateCaption = useCallback((id: string, caption: string) => {
    setAttachments((prev) => prev.map((a) => a.id === id ? { ...a, caption } : a));
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const buildReferencesText = useCallback((): string => {
    const parts: string[] = [];

    // Template PPTX structure — injected as PRIMARY input
    if (templateTextSummary) {
      parts.push(`=== TEMPLATE PPTX BASE (${templateFileName || 'template.pptx'}) ===
ESTRUTURA OBRIGATÓRIA: O conteúdo abaixo é a estrutura do template PPTX enviado pelo usuário. Você DEVE usar esta estrutura como base, mantendo a mesma quantidade de slides, mesmos campos e mesma organização. Substitua os textos placeholder por conteúdo novo baseado no briefing.

${templateTextSummary.slice(0, 12_000)}
=== FIM DO TEMPLATE ===`);
    }

    // Other attachments (non-PPTX)
    for (const att of attachments) {
      if (att.type === 'image') {
        parts.push(`[Imagem: ${att.name}]${att.caption ? ` — ${att.caption}` : ' (referência visual)'}`);
      } else {
        const desc = att.caption ? `${att.caption}\n` : '';
        const text = att.content ? att.content.slice(0, 8_000) : '';
        parts.push(`[Arquivo: ${att.name}]\n${desc}${text}`);
      }
    }
    return parts.length > 0 ? parts.join('\n\n---\n\n') : '';
  }, [attachments, templateTextSummary, templateFileName]);

  const handleGenerate = useCallback(async () => {
    if (!briefing.trim()) return;

    const references = buildReferencesText();

    const project = store.createProject({
      title: title || `${PRESENTATION_CATEGORY_LABELS[category]} — ${new Date().toLocaleDateString('pt-BR')}`,
      category,
      briefing,
      audience,
      tone,
      duration,
      attachments,
      references,
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
                // Also try to get exec_data from strategist output
                let strategyExecMap: Record<number, any> = {};
                try {
                  const stratOutput = updated.agents.find(a => a.agentId === 'content-planner')?.output || '{}';
                  const strat = JSON.parse(stratOutput);
                  if (strat.slide_plan || strat.slide_structure) {
                    for (const ss of (strat.slide_plan || strat.slide_structure)) {
                      if (ss.exec_data) strategyExecMap[ss.order] = ss.exec_data;
                    }
                  }
                } catch { /* skip */ }

                const slides: SlideContent[] = parsed.slides.map((s: any, i: number) => {
                  const isExecReport = !!(s.exec_data || strategyExecMap[s.order ?? i]);
                  const rawExec = s.exec_data || strategyExecMap[s.order ?? i];
                  return {
                    id: `slide-${i}`,
                    order: s.order ?? i,
                    title: s.title || '',
                    subtitle: s.subtitle || '',
                    bullets: s.bullets || [],
                    speakerNotes: '',
                    visualSuggestion: '',
                    layoutType: isExecReport ? 'exec-report' : (i === 0 ? 'title' : i === parsed.slides.length - 1 ? 'closing' : 'content'),
                    duration: 60,
                    execData: rawExec ? {
                      problema: rawExec.problema || s.title || '',
                      hipotese: rawExec.hipotese || '',
                      solucao: rawExec.solucao || '',
                      resultadoTangivel: rawExec.resultado_tangivel || '',
                      resultadoIntangivel: rawExec.resultado_intangivel || '',
                      objetivo: rawExec.objetivo || '',
                      investimentoTotal: rawExec.investimento_total || 'R$ —',
                      vpl: rawExec.vpl || 'R$ —',
                      roiAcumulado: rawExec.roi_acumulado || '—%',
                      tir: rawExec.tir || '—% a.a',
                      paybackSimples: rawExec.payback_simples || '—',
                      paybackDescontado: rawExec.payback_descontado || '—',
                      aumentoReceita: rawExec.aumento_receita || '—%',
                      reducaoCusto: rawExec.reducao_custo || '—%',
                      eficienciaOperacional: rawExec.eficiencia_operacional || '—%',
                    } : undefined,
                  };
                });
                updated.slides = slides;
                store.setSlides(project.id, slides);
              }
            } catch { /* skip parse errors */ }
          }

          // Merge designer layouts into existing slides
          if (agentId === 'designer' && updated.slides.length > 0) {
            try {
              const parsed = JSON.parse(output);

              // Extract designer's design_system for use in PPTX export
              if (parsed.design_system) {
                setDesignSystem(parsed.design_system);
                console.log('[Designer] Extracted design_system:', parsed.design_system);
              }

              if (parsed.slides) {
                // Build a map of image names → base64 data from attachments
                const imageMap: Record<string, string> = {};
                for (const att of (project.attachments || [])) {
                  if (att.type === 'image' && att.preview) {
                    imageMap[att.name.toLowerCase()] = att.preview;
                  }
                }

                const enriched = updated.slides.map((slide) => {
                  const arch = parsed.slides.find((a: any) => a.order === slide.order);
                  if (arch) {
                    // Try to match background_image name to actual attachment
                    let bgImage: string | undefined;
                    let bgImageName: string | undefined;
                    if (arch.background_image && arch.background_image !== 'null') {
                      const needle = arch.background_image.toLowerCase();
                      // Exact match or partial match
                      bgImage = imageMap[needle];
                      bgImageName = arch.background_image;
                      if (!bgImage) {
                        // Try partial match
                        const key = Object.keys(imageMap).find((k) => k.includes(needle) || needle.includes(k));
                        if (key) bgImage = imageMap[key];
                      }
                    }
                    return {
                      ...slide,
                      layoutType: arch.layout_type || slide.layoutType,
                      visualSuggestion: arch.visual_suggestion || slide.visualSuggestion,
                      backgroundImage: bgImage,
                      referenceImageName: bgImageName,
                    };
                  }
                  return slide;
                });

                // If architect didn't assign images but we have them, auto-assign to key slides
                const hasAssigned = enriched.some((s) => s.backgroundImage);
                if (!hasAssigned && Object.keys(imageMap).length > 0) {
                  const images = Object.values(imageMap);
                  const priorities = ['title', 'closing', 'section-break', 'content'];
                  let imgIdx = 0;
                  for (const prio of priorities) {
                    if (imgIdx >= images.length) break;
                    const target = enriched.find((s) => s.layoutType === prio && !s.backgroundImage);
                    if (target) {
                      target.backgroundImage = images[imgIdx++];
                    }
                  }
                }

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

          // Parse key messages from content-planner
          if (agentId === 'content-planner') {
            try {
              const parsed = JSON.parse(output);
              if (parsed.key_messages) {
                updated.keyMessages = parsed.key_messages;
                store.setKeyMessages(project.id, parsed.key_messages);
              } else if (parsed.slide_plan) {
                const msgs = parsed.slide_plan.map((s: any) => s.key_message).filter(Boolean);
                updated.keyMessages = msgs;
                store.setKeyMessages(project.id, msgs);
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

          // Parse quality-reviewer feedback
          if (agentId === 'quality-reviewer') {
            try {
              const parsed = JSON.parse(output);
              updated.reviewFeedback = `Score: ${parsed.overall_score}/100 — ${parsed.final_verdict}`;
              store.setReviewFeedback(project.id, updated.reviewFeedback);
            } catch { /* skip */ }
          }

          // Finalizer: parse final merged slide deck (overwrites all slides)
          if (agentId === 'finalizer') {
            try {
              const parsed = JSON.parse(output);
              if (parsed.slides) {
                const slides: SlideContent[] = parsed.slides.map((s: any, i: number) => {
                  const rawExec = s.execData || s.exec_data;
                  return {
                    id: `slide-${i}`,
                    order: s.order ?? i,
                    title: s.title || '',
                    subtitle: s.subtitle || '',
                    bullets: s.bullets || [],
                    speakerNotes: s.speakerNotes || s.speaker_notes || '',
                    visualSuggestion: s.visualSuggestion || s.visual_suggestion || '',
                    layoutType: s.layoutType || s.layout_type || (i === 0 ? 'title' : 'content'),
                    duration: s.duration || s.duration_seconds || 60,
                    execData: rawExec ? {
                      problema: rawExec.problema || '',
                      hipotese: rawExec.hipotese || '',
                      solucao: rawExec.solucao || '',
                      resultadoTangivel: rawExec.resultadoTangivel || rawExec.resultado_tangivel || '',
                      resultadoIntangivel: rawExec.resultadoIntangivel || rawExec.resultado_intangivel || '',
                      objetivo: rawExec.objetivo || '',
                      investimentoTotal: rawExec.investimentoTotal || rawExec.investimento_total || 'R$ —',
                      vpl: rawExec.vpl || 'R$ —',
                      roiAcumulado: rawExec.roiAcumulado || rawExec.roi_acumulado || '—%',
                      tir: rawExec.tir || '—% a.a',
                      paybackSimples: rawExec.paybackSimples || rawExec.payback_simples || '—',
                      paybackDescontado: rawExec.paybackDescontado || rawExec.payback_descontado || '—',
                      aumentoReceita: rawExec.aumentoReceita || rawExec.aumento_receita || '—%',
                      reducaoCusto: rawExec.reducaoCusto || rawExec.reducao_custo || '—%',
                      eficienciaOperacional: rawExec.eficienciaOperacional || rawExec.eficiencia_operacional || '—%',
                    } : undefined,
                  };
                });

                // Preserve background images from designer pass
                const prevSlides = updated.slides;
                for (const slide of slides) {
                  const prev = prevSlides.find((p) => p.order === slide.order);
                  if (prev?.backgroundImage) {
                    slide.backgroundImage = prev.backgroundImage;
                    slide.referenceImageName = prev.referenceImageName;
                  }
                }

                updated.slides = slides;
                store.setSlides(project.id, slides);
              }
            } catch { /* skip parse errors */ }
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
  }, [briefing, title, category, audience, tone, duration, attachments, buildReferencesText, templatePptxBase64, store]);

  const handleReset = () => {
    setActiveProject(null);
    setIsRunning(false);
    setBriefing('');
    setTitle('');
    setAudience('');
    setAttachments([]);
    setTemplatePptxBase64(null);
    setTemplateTextSummary(null);
    setTemplateFileName(null);
    setDesignSystem(null);
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

  const [exporting, setExporting] = useState(false);

  const handleExportPptx = async () => {
    if (!activeProject?.slides?.length) return;
    setExporting(true);
    try {
      if (templatePptxBase64) {
        // Template-based export: clone original PPTX and fill data
        await exportFromTemplate(
          templatePptxBase64,
          activeProject.slides,
          activeProject.title,
          activeProject.briefing.slice(0, 80),
        );
      } else {
        // Programmatic export: generate from scratch with pptxgenjs
        // Pass designer's color system if available
        await exportToPptx(
          activeProject.slides,
          activeProject.title,
          activeProject.briefing.slice(0, 80),
          designSystem || undefined,
        );
      }
    } catch (err) {
      console.error('PPTX export failed:', err);
    } finally {
      setExporting(false);
    }
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
                <Sparkles className="h-4 w-4" /> 7 Agentes IA trabalhando para você
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                Descreva. Nós <span className="bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">forjamos</span>.
              </h1>
              <p className="mx-auto max-w-xl text-gray-500 dark:text-gray-400">
                Descreva o que precisa em linguagem natural. Nossos agentes especializados criam a apresentação inteira em segundos.
              </p>
            </div>

            {/* Briefing Form */}
            <Card className="p-6 space-y-5">
              {/* Category Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Para que tipo de apresentação?</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCategory(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${
                        category === opt.value
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 shadow-sm'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-500 dark:text-gray-400'
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Descreva o que precisa <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                  placeholder="Ex.: Preciso de um pitch de 15 minutos para o board executivo da Acme sobre como IA generativa pode reduzir churn em 40%. A audiência é o CEO, CFO e CTO. Quero dados impactantes e um CTA claro para aprovar o PoC..."
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{briefing.length}/2000 caracteres</p>
              </div>

              {/* Reference Materials Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Material de referência <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(opcional)</span>
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                  Imagens de inspiração, apresentações existentes, documentos de base — os agentes usam como referência.
                </p>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-brand-500', 'bg-brand-50/50'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('border-brand-500', 'bg-brand-50/50'); }}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-brand-500', 'bg-brand-50/50'); handleFileSelect(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 cursor-pointer transition-colors hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {parsingPptx ? (
                    <>
                      <Loader2 className="h-6 w-6 text-brand-500 animate-spin" />
                      <p className="text-sm text-brand-600 font-medium">Extraindo slides, imagens e textos do PPTX...</p>
                    </>
                  ) : (
                    <>
                      <Paperclip className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Arraste arquivos aqui ou <span className="text-brand-600 dark:text-brand-400 font-medium">clique para selecionar</span>
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        <span className="font-medium text-brand-500">.pptx (template)</span>, Imagens (.png, .jpg), Textos (.txt, .md), Docs (.pdf, .csv)
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.txt,.md,.csv,.pdf,.json,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>

                {/* Template indicator */}
                {templatePptxBase64 && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <span className="text-green-600 text-sm">✅</span>
                    <p className="text-xs text-green-700 font-medium">
                      Template PPTX carregado — o export vai clonar o arquivo original e preencher os dados (preservando fontes, cores, imagens e layout)
                    </p>
                    <button
                      onClick={() => { setTemplatePptxBase64(null); setTemplateTextSummary(null); setTemplateFileName(null); }}
                      className="ml-auto text-[10px] text-green-500 hover:text-red-500 underline"
                    >
                      remover
                    </button>
                  </div>
                )}

                {/* Attachment List */}
                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((att) => (
                      <div key={att.id} className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                        {/* Thumbnail or icon */}
                        {att.type === 'image' && att.preview ? (
                          <img src={att.preview} alt={att.name} className="h-14 w-14 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0" />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0">
                            <FileText className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}

                        {/* Info + Caption */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{att.name}</p>
                            <button onClick={() => removeAttachment(att.id)} className="shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1">
                            {att.name.includes('.pptx') ? '📊 Extraído do PPTX' : att.type === 'image' ? '🖼️ Imagem' : '📄 Documento'} — {att.size > 1024 ? `${(att.size / 1024).toFixed(0)} KB` : `${att.size} B`}
                            {att.content ? ` — ${att.content.length.toLocaleString()} chars extraídos` : ''}
                          </p>
                          <input
                            type="text"
                            value={att.caption}
                            onChange={(e) => updateCaption(att.id, e.target.value)}
                            placeholder={att.type === 'image' ? 'Descreva o que esta imagem representa (ex.: estilo visual futurístico que quero)' : 'Descreva o contexto deste arquivo (ex.: apresentação anterior como base)'}
                            className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 placeholder-gray-300 dark:placeholder-gray-600 focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                      💡 Dica: captions descritivas ajudam os agentes a entender o que você quer. Para imagens, descreva o estilo/conteúdo desejado.
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Settings */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Audiência</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">Selecione a audiência</option>
                    {AUDIENCE_SUGGESTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Duração</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {DURATION_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tom</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
                className="flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                Configurações avançadas
              </button>

              {showAdvanced && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Título (opcional)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      placeholder="Será gerado automaticamente se não informado"
                    />
                  </div>
                </div>
              )}

              {/* Generate Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~2 minutos</span>
                  <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> 7 agentes</span>
                  {attachments.length > 0 && (
                    <span className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {attachments.length} referência{attachments.length > 1 ? 's' : ''}</span>
                  )}
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
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recentes</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {store.projects.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleViewProject(p)}
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left transition-all hover:border-brand-300 hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400">
                          {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                        <Badge variant={p.status === 'done' ? 'success' : p.status === 'error' ? 'error' : 'default'}>
                          {p.status === 'done' ? 'Gerado' : p.status === 'error' ? 'Erro' : 'Rascunho'}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{p.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.briefing}</p>
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
                  className="rounded-lg p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{activeProject.title}</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{activeProject.briefing.slice(0, 80)}...</p>
                </div>
              </div>
              {isDone && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopySlides}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiado!' : 'Copiar tudo'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExportPptx}
                    disabled={exporting}
                    className="bg-gradient-to-r from-brand-600 to-purple-600 text-white hover:from-brand-700 hover:to-purple-700"
                  >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {exporting ? 'Exportando...' : templatePptxBase64 ? '📎 Baixar PPTX (Template)' : 'Baixar PPTX'}
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
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Agentes trabalhando...
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Agent Pipeline Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {AGENT_PIPELINE.map((agentId, idx) => {
                const agent = AGENTS[agentId];
                const state = activeProject.agents.find((a) => a.agentId === agentId);
                const isExpanded = expandedAgent === agentId;
                const status = state?.status || 'idle';

                return (
                  <button
                    key={agentId}
                    onClick={() => setExpandedAgent(isExpanded ? null : agentId)}
                    className={`relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                      status === 'running'
                        ? `${agent.borderColor} ${agent.bgColor} shadow-md animate-pulse`
                        : status === 'done'
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30'
                        : status === 'error'
                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {/* Step number */}
                    <div className={`absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-sm ${
                      status === 'done' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : status === 'running' ? 'bg-brand-500' : 'bg-gray-400'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          status === 'done' ? 'bg-green-100' : status === 'error' ? 'bg-red-100' : agent.bgColor
                        } text-base`}>
                          {agent.emoji}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{agent.name}</p>
                          <p className={`text-[11px] font-medium ${status === 'done' ? 'text-green-600' : status === 'error' ? 'text-red-600' : agent.color}`}>{agent.role}</p>
                        </div>
                      </div>
                      {status === 'running' && <Loader2 className={`h-4 w-4 animate-spin ${agent.color}`} />}
                      {status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                      {status === 'idle' && <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />}
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">{agent.description}</p>

                    {status === 'error' && state?.output && (
                      <p className="mt-1 text-[11px] text-red-600 leading-tight">
                        ⚠️ {state.output.slice(0, 120)}{state.output.length > 120 ? '...' : ''}
                      </p>
                    )}

                    {isExpanded && state?.output && status === 'done' && (
                      <div className="mt-2 rounded-lg bg-white/80 dark:bg-gray-900/80 p-3 text-xs text-gray-700 dark:text-gray-300 max-h-48 overflow-y-auto font-mono whitespace-pre-wrap border border-gray-200 dark:border-gray-700">
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
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
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
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
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
                    'exec-report': 'from-white to-gray-50',
                  };
                  const gradient = layoutColors[slide.layoutType] || layoutColors.content;

                  // Special render for exec-report slides
                  if (slide.layoutType === 'exec-report' && slide.execData) {
                    const d = slide.execData;
                    return (
                      <div className="space-y-4">
                        <div className="relative aspect-video max-w-3xl rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100">
                          {/* Avanade accent bar */}
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-400" />
                          
                          <div className="flex h-full gap-3">
                            {/* Left: Problem + Solution */}
                            <div className="flex-1 flex flex-col gap-2 min-w-0">
                              <div>
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">{d.problema || slide.title}</h2>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hipótese testada: {d.hipotese}</p>
                              </div>
                              
                              {/* Solution box */}
                              <div className="rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 p-3 text-white flex-1">
                                <h3 className="text-xs font-bold mb-1.5">Solução</h3>
                                <p className="text-[10px] sm:text-xs mb-1.5">{d.solucao}</p>
                                <ul className="space-y-1">
                                  <li className="text-[10px] flex items-start gap-1">
                                    <span className="mt-0.5">•</span> {d.resultadoTangivel}
                                  </li>
                                  <li className="text-[10px] flex items-start gap-1">
                                    <span className="mt-0.5">•</span> {d.resultadoIntangivel}
                                  </li>
                                </ul>
                              </div>

                              {/* Objetivo */}
                              <div className="rounded border border-dashed border-gray-300 dark:border-gray-600 p-2 text-center">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{d.objetivo}</p>
                              </div>
                            </div>

                            {/* Right: Business Case Metrics */}
                            <div className="flex-1 flex flex-col gap-2 min-w-0">
                              {/* Impact bars */}
                              <div className="space-y-1">
                                <p className="text-[9px] text-gray-500 font-medium">Potencial de impacto</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] text-orange-600 font-medium w-24 truncate">Aumento receita</span>
                                  <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full" style={{ width: d.aumentoReceita }} /></div>
                                  <span className="text-[10px] font-bold text-orange-600 w-8 text-right">{d.aumentoReceita}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] text-orange-600 font-medium w-24 truncate">Redução de custo</span>
                                  <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="bg-orange-400 h-2 rounded-full" style={{ width: d.reducaoCusto }} /></div>
                                  <span className="text-[10px] font-bold text-orange-600 w-8 text-right">{d.reducaoCusto}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] text-orange-600 font-medium w-24 truncate">Eficiência oper.</span>
                                  <div className="flex-1 bg-gray-100 rounded-full h-2"><div className="bg-orange-300 h-2 rounded-full" style={{ width: d.eficienciaOperacional }} /></div>
                                  <span className="text-[10px] font-bold text-orange-600 w-8 text-right">{d.eficienciaOperacional}</span>
                                </div>
                              </div>

                              {/* Cenário */}
                              <div className="bg-orange-500 text-white rounded-lg px-2 py-1 text-center">
                                <span className="text-[10px] font-bold uppercase tracking-wide">Cenário Apresentado</span>
                              </div>

                              {/* Financial metrics grid */}
                              <div className="grid grid-cols-2 gap-1.5 flex-1">
                                <div className="border border-gray-200 rounded p-1.5 text-center">
                                  <p className="text-[8px] text-gray-500">Investimento total</p>
                                  <p className="text-[8px] text-gray-400">(CAPEX+OPEX)</p>
                                  <p className="text-sm font-bold text-orange-600">{d.investimentoTotal}</p>
                                </div>
                                <div className="border border-gray-200 rounded p-1.5 text-center">
                                  <p className="text-[8px] text-gray-500">VPL (a 10% a.a.)</p>
                                  <p className="text-sm font-bold text-orange-600">{d.vpl}</p>
                                </div>
                                <div className="border border-gray-200 rounded p-1.5 text-center">
                                  <p className="text-[8px] text-gray-500">ROI acumulado 5 anos</p>
                                  <p className="text-sm font-bold text-orange-600">{d.roiAcumulado}</p>
                                </div>
                                <div className="border border-gray-200 rounded p-1.5 text-center">
                                  <p className="text-[8px] text-gray-500">TIR</p>
                                  <p className="text-sm font-bold text-orange-600">{d.tir}</p>
                                </div>
                                <div className="border border-gray-200 rounded p-1.5 text-center">
                                  <p className="text-[8px] text-gray-500">Payback Simples</p>
                                  <p className="text-[10px] font-bold text-orange-600">{d.paybackSimples}</p>
                                </div>
                                <div className="border border-gray-200 rounded p-1.5 text-center">
                                  <p className="text-[8px] text-gray-500">Payback descontado (10%a.a)</p>
                                  <p className="text-[10px] font-bold text-orange-600">{d.paybackDescontado}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Avanade footer */}
                          <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between">
                            <span className="text-[8px] text-gray-400 font-semibold tracking-wide">avanade</span>
                            <span className="text-[8px] text-gray-300">©2026 Avanade Inc. All Rights Reserved.</span>
                            <span className="text-[8px] text-gray-400 font-semibold">Do what matters</span>
                          </div>

                          {/* Slide number */}
                          <div className="absolute bottom-2 right-4 text-[8px] text-gray-300 font-mono">
                            {String(activeSlide + 1).padStart(2, '0')}
                          </div>
                        </div>

                        {/* Slide Details */}
                        <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
                          {slide.speakerNotes && (
                            <Card className="p-4">
                              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                <MessageSquare className="h-3.5 w-3.5" /> Speaker Notes
                              </h4>
                              <p className="text-sm text-gray-700 dark:text-gray-200">{slide.speakerNotes}</p>
                            </Card>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Slide Visual */}
                      <div
                        className={`relative aspect-video max-w-3xl rounded-2xl bg-gradient-to-br ${gradient} p-8 sm:p-12 text-white shadow-2xl overflow-hidden`}
                        style={slide.backgroundImage ? { backgroundImage: `url(${slide.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                      >
                        {/* Dark overlay for readability when using background image */}
                        {slide.backgroundImage && (
                          <div className="absolute inset-0 bg-black/50 z-0" />
                        )}
                        {/* Background decoration (only when no image) */}
                        {!slide.backgroundImage && (
                          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
                            <div className="absolute top-8 right-8 w-32 h-32 rounded-full bg-white/20" />
                            <div className="absolute bottom-12 right-24 w-20 h-20 rounded-full bg-white/10" />
                          </div>
                        )}

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
                            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                              <MessageSquare className="h-3.5 w-3.5" /> Speaker Notes
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-200">{slide.speakerNotes}</p>
                          </Card>
                        )}
                        {slide.visualSuggestion && (
                          <Card className="p-4">
                            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                              <Eye className="h-3.5 w-3.5" /> Sugestão Visual
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-200">{slide.visualSuggestion}</p>
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
                        <span className="text-xs text-gray-400 dark:text-gray-500">
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
                {/* Export CTA */}
                <div className="flex justify-center max-w-5xl">
                  <button
                    onClick={handleExportPptx}
                    disabled={exporting}
                    className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 px-8 py-3.5 text-white font-semibold shadow-lg hover:shadow-xl hover:from-brand-700 hover:to-purple-700 transition-all disabled:opacity-60"
                  >
                    {exporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                    {exporting ? 'Gerando PPTX...' : templatePptxBase64 ? '📎 Baixar PPTX (Template Original)' : 'Baixar Apresentação (.pptx)'}
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl">
                  {activeProject.keyMessages.length > 0 && (
                    <Card className="p-4">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                        <Lightbulb className="h-3.5 w-3.5" /> Mensagens-Chave
                      </h4>
                      <ul className="space-y-2">
                        {activeProject.keyMessages.map((m, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">{i + 1}</span>
                            {m}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {activeProject.researchInsights.length > 0 && (
                    <Card className="p-4">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                        🔍 Dados & Insights
                      </h4>
                      <ul className="space-y-2">
                        {activeProject.researchInsights.map((m, i) => (
                          <li key={i} className="text-sm text-gray-700 dark:text-gray-200 border-l-2 border-purple-300 dark:border-purple-600 pl-3">{m}</li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {activeProject.reviewFeedback && (
                    <Card className="p-4">
                      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                        🔎 Avaliação do Reviewer
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-200">{activeProject.reviewFeedback}</p>
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

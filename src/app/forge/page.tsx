'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Upload,
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

// --- Human-readable Agent Output Summarizer ---
function summarizeAgentOutput(agentId: AgentId, output: string): { summary: string; details: string[] } {
  try {
    const data = JSON.parse(output);
    switch (agentId) {
      case 'content-planner': {
        const plan = data.slide_plan || data.slides || [];
        const concept = data.presentation_concept || data.concept || '';
        const outcome = data.target_outcome || '';
        return {
          summary: concept || `Plano com ${plan.length} slides definido`,
          details: [
            `📊 ${plan.length} slides planejados`,
            ...(outcome ? [`🎯 Objetivo: ${outcome.slice(0, 80)}`] : []),
            ...(data.narrative_arc ? [`📖 Arco: ${data.narrative_arc.slice(0, 60)}`] : []),
            ...plan.slice(0, 4).map((s: any) => `  ${s.order ?? '•'}. [${s.layout_id}] ${s.purpose?.slice(0, 50) || s.key_message?.slice(0, 50) || ''}`),
            ...(plan.length > 4 ? [`  ... +${plan.length - 4} slides`] : []),
          ],
        };
      }
      case 'researcher': {
        const insights = data.insights || [];
        const benchmarks = data.benchmarks || [];
        return {
          summary: `${insights.length} insights + ${benchmarks.length} benchmarks encontrados`,
          details: [
            ...insights.slice(0, 3).map((i: any) => `🔍 ${(i.fact || '').slice(0, 70)}${i.source ? ` — ${i.source}` : ''}`),
            ...(insights.length > 3 ? [`  ... +${insights.length - 3} insights`] : []),
            ...benchmarks.slice(0, 2).map((b: any) => `📈 ${b.metric}: ${b.value}`),
            ...(data.market_data ? [`🌍 ${data.market_data.slice(0, 80)}`] : []),
          ],
        };
      }
      case 'copywriter': {
        const slides = data.slides || [];
        return {
          summary: `Copy completo para ${slides.length} slides`,
          details: slides.slice(0, 5).map((s: any) =>
            `✍️ Slide ${s.order ?? '?'}: "${(s.title || s.fields?.title || '').slice(0, 50)}" ${s.bullets?.length ? `(${s.bullets.length} bullets)` : ''}`
          ).concat(slides.length > 5 ? [`  ... +${slides.length - 5} slides`] : []),
        };
      }
      case 'designer': {
        const slides = data.slides || [];
        const ds = data.design_system || {};
        return {
          summary: `Design visual para ${slides.length} slides`,
          details: [
            ...(ds.visual_theme ? [`🎨 Tema: ${ds.visual_theme.slice(0, 60)}`] : []),
            ...(ds.primary_color ? [`🔵 Cor: ${ds.primary_color}`] : []),
            ...slides.slice(0, 4).map((s: any) =>
              `🖼️ Slide ${s.order ?? '?'}: ${s.layout_type || '?'} ${s.background_image ? '+ imagem' : ''}`
            ),
          ],
        };
      }
      case 'storyteller': {
        const slides = data.slides || [];
        const totalSec = slides.reduce((t: number, s: any) => t + (s.duration_seconds || 0), 0);
        const pauses = slides.filter((s: any) => s.dramatic_pause).length;
        return {
          summary: `Roteiro completo — ${Math.round(totalSec / 60)}min, ${pauses} pausas dramáticas`,
          details: [
            `⏱️ Duração total: ${Math.round(totalSec / 60)}min ${totalSec % 60}s`,
            ...(data.opening_script ? [`🎬 Abertura: "${data.opening_script.slice(0, 60)}..."`] : []),
            ...slides.slice(0, 3).map((s: any) =>
              `🎤 Slide ${s.order ?? '?'}: ${(s.speaker_notes || '').slice(0, 50)}...`
            ),
            ...(data.closing_script ? [`🏁 Fechamento: "${data.closing_script.slice(0, 60)}..."`] : []),
          ],
        };
      }
      case 'quality-reviewer': {
        const score = data.overall_score || '?';
        const issues = data.critical_issues || [];
        const improvements = data.improvements || [];
        return {
          summary: `Score: ${score}/100 — ${issues.length} problemas críticos`,
          details: [
            `⭐ Nota: ${score}/100`,
            ...(data.strengths || []).slice(0, 2).map((s: string) => `✅ ${s.slice(0, 60)}`),
            ...issues.slice(0, 3).map((i: any) => `⚠️ Slide ${i.slide_order}: ${(i.issue || '').slice(0, 50)}`),
            ...(data.final_verdict ? [`📋 Veredicto: ${data.final_verdict.slice(0, 80)}`] : []),
          ],
        };
      }
      case 'finalizer': {
        const slides = data.slides || [];
        const withNotes = slides.filter((s: any) => s.speakerNotes || s.speaker_notes).length;
        const withFields = slides.filter((s: any) => s.fields && Object.keys(s.fields).length > 0).length;
        return {
          summary: `Deck final: ${slides.length} slides prontos para exportar`,
          details: [
            `📦 ${slides.length} slides finalizados`,
            `🎤 ${withNotes} com speaker notes`,
            `📋 ${withFields} com campos de template preenchidos`,
            ...slides.slice(0, 4).map((s: any) =>
              `  ${s.order ?? '?'}. [${s.layout_id || '?'}] ${(s.title || s.fields?.title || '').slice(0, 45)}`
            ),
            ...(slides.length > 4 ? [`  ... +${slides.length - 4} slides`] : []),
          ],
        };
      }
      default:
        return { summary: 'Concluído', details: [] };
    }
  } catch {
    return { summary: `Resposta recebida (${output.length} chars)`, details: [] };
  }
}

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
  { value: 'relatorio-executivo', emoji: '📊', label: 'Relatório Executivo' },
  { value: 'business-case', emoji: '💼', label: 'Business Case' },
  { value: 'apresentacao-livre', emoji: '🎯', label: 'Apresentação Livre' },
];

// --- Default prompts per category (same as dashboard quick-starts) ---
const DEFAULT_PROMPTS: Record<PresentationCategory, string> = {
  'relatorio-executivo': 'Relatório executivo com business case. Para cada caso/hipótese, gerar slide estruturado com: Problema + Hipótese testada, Solução (resultado tangível + intangível), Objetivo, Business Case completo (Investimento Total CAPEX+OPEX, VPL, ROI acumulado 5 anos, TIR, Payback Simples, Payback Descontado), e Potencial de Impacto (Aumento Receita %, Redução Custo %, Eficiência Operacional %). Usar template PPTX enviado como referência.',
  'business-case': 'Business Case Executivo completo. Apresentar: contexto e problema de negócio com indicadores críticos, tese da solução com 3 impactos quantificados, base econômica com benchmarks de mercado (tabela de premissas), impacto financeiro anual com cálculos detalhados dos 3 principais benefícios, e waterfall de 3 anos com payback, NPV e ROI. Formato monetário brasileiro (R$). Horizonte de 3 anos.',
  'apresentacao-livre': 'Crie uma apresentação profissional completa sobre o tema que vou descrever. A IA deve decidir autonomamente: quantos slides usar, quais layouts aplicar (texto, gráficos de barra/pizza/linha, tabelas, comparações, dashboards de KPIs), e como organizar a narrativa. Incluir dados visuais sempre que possível. Descreva o tema/contexto:',
};

// ==============================================
// FORGE PAGE — Hub Principal de Geração
// ==============================================

function ForgePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useForgeStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Briefing form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PresentationCategory>('relatorio-executivo');
  const [briefing, setBriefing] = useState(DEFAULT_PROMPTS['relatorio-executivo']);
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('executivo');
  const [duration, setDuration] = useState(15);

  // Auto-fill from dashboard quick-start URL params (?prompt=...&cat=...&dur=...)
  useEffect(() => {
    const qPrompt = searchParams.get('prompt');
    const qCat = searchParams.get('cat');
    const qDur = searchParams.get('dur');
    if (qPrompt) setBriefing(qPrompt);
    if (qCat) {
      const cat = qCat as PresentationCategory;
      setCategory(cat);
      // If no explicit prompt param, fill with default for the category
      if (!qPrompt && DEFAULT_PROMPTS[cat]) setBriefing(DEFAULT_PROMPTS[cat]);
    }
    if (qDur) setDuration(parseInt(qDur, 10) || 15);
  }, [searchParams]);
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
  const [isDragging, setIsDragging] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState<string | null>(null);
  const dragCounter = useRef(0);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Close attach menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        // OCR: extract text from image in background
        const attId = id;
        newAttachments.push({
          id, name: file.name, type: 'image', size: file.size,
          preview, caption: '', content: '',
        });
        // Launch OCR asynchronously
        (async () => {
          try {
            setOcrProcessing(attId);
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker('por+eng');
            const { data: { text } } = await worker.recognize(preview);
            await worker.terminate();
            const trimmed = text.trim();
            if (trimmed) {
              setAttachments(prev => prev.map(a =>
                a.id === attId ? { ...a, content: trimmed, caption: a.caption || 'OCR: texto extraído da imagem' } : a
              ));
            }
          } catch (err) {
            console.warn('OCR failed for', file.name, err);
          } finally {
            setOcrProcessing(null);
          }
        })();
        continue; // skip the push below since we already pushed
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

  // --- Drag-and-drop handlers ---
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Paste handler — supports images from clipboard (Ctrl+V)
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        handleFileSelect(dt.files);
      }
    }
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFileSelect]);

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
                  // Map layout_id to layoutType for the UI
                  const rawLayout = s.layout_id || s.layoutType || s.layout_type || s.layoutHint || '';
                  let layoutType: string;
                  if (rawLayout === 'er-dashboard' || rawLayout === 'exec-report') layoutType = 'exec-report';
                  else if (rawLayout === 'er-cover' || rawLayout === 'cover') layoutType = i === 0 ? 'title' : 'content';
                  else if (rawLayout === 'er-closing' || rawLayout === 'closing') layoutType = 'closing';
                  else if (rawLayout === 'er-prototype') layoutType = 'content';
                  else if (rawLayout === 'er-recommendations') layoutType = 'content';
                  else layoutType = rawLayout || (i === 0 ? 'title' : 'content');
                  return {
                    id: `slide-${i}`,
                    order: s.order ?? i,
                    title: s.title || s.fields?.title || s.fields?.case_name || '',
                    subtitle: s.subtitle || s.fields?.subtitle || '',
                    bullets: s.bullets || [],
                    speakerNotes: s.speakerNotes || s.speaker_notes || '',
                    visualSuggestion: s.visualSuggestion || s.visual_suggestion || '',
                    layoutType,
                    duration: s.duration || s.duration_seconds || 60,
                    // Preserve fields for template export
                    ...(s.fields ? { fields: s.fields } : {}),
                    ...(s.layout_id ? { layout_id: s.layout_id } : {}),
                    // Preserve apresentacao-livre dynamic fields
                    ...(s.layoutHint ? { layoutHint: s.layoutHint } : {}),
                    ...(s.chartData ? { chartData: s.chartData } : {}),
                    ...(s.tableData ? { tableData: s.tableData } : {}),
                    ...(s.accentColor ? { accentColor: s.accentColor } : {}),
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
        // Template-based export with user's custom PPTX
        await exportFromTemplate(
          activeProject.slides,
          activeProject.title,
          activeProject.briefing.slice(0, 80),
          templatePptxBase64,
          activeProject.category,
        );
      } else {
        // Always use the built-in template (standard, exec report, or business case based on category)
        await exportFromTemplate(
          activeProject.slides,
          activeProject.title,
          activeProject.briefing.slice(0, 80),
          undefined,
          activeProject.category,
        );
      }
    } catch (err: any) {
      console.error('PPTX export failed:', err);
      alert(`Erro ao exportar PPTX: ${err?.message || 'Erro desconhecido'}. Tente novamente.`);
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
            {/* Hero — compact */}
            <div className="text-center space-y-2 pt-2 pb-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                O que vamos <span className="text-[#FF5800]">forjar</span> hoje?
              </h1>
              <p className="mx-auto max-w-lg text-sm text-gray-500 dark:text-gray-400">
                Descreva o que precisa — tipo, contexto, audiência, tudo num só lugar. 7 agentes IA cuidam do resto.
              </p>
            </div>

            {/* ═══ Unified Prompt Card ═══ */}
            <Card
              className={`relative overflow-hidden transition-all ${isDragging ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-gray-50 dark:ring-offset-nero-900' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Drag overlay */}
              {isDragging && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-brand-50/90 dark:bg-nero-900/90 border-2 border-dashed border-brand-500 rounded-lg backdrop-blur-sm">
                  <Paperclip className="h-8 w-8 text-brand-500 mb-2" />
                  <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">Solte os arquivos aqui</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PPTX, imagens, PDF, TXT, CSV, JSON</p>
                </div>
              )}

              {/* Category Pills — compact horizontal strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto px-4 pt-4 pb-2 scrollbar-hide">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setCategory(opt.value);
                      // Update briefing to default prompt for new category (only if current is default or empty)
                      const currentDefault = DEFAULT_PROMPTS[category];
                      if (!briefing.trim() || briefing === currentDefault) {
                        setBriefing(DEFAULT_PROMPTS[opt.value] || '');
                      }
                    }}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      category === opt.value
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25'
                        : 'bg-gray-100 dark:bg-nero-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-nero-600'
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Main Prompt Area */}
              <div className="px-4 pb-2">
                <textarea
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                  rows={5}
                  className="w-full border-0 bg-transparent px-0 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-0 resize-none"
                  placeholder={
                    category === 'business-case'
                      ? 'Ex.: Business case para plataforma de capacitação com IA. 2.000 vendedores, ticket médio R$ 5.000, turnover 35%. Investimento R$ 1.5M, horizonte 3 anos. Mostrar ROI, payback e waterfall financeiro.'
                      : category === 'apresentacao-livre'
                      ? 'Ex.: Apresentação sobre transformação digital na indústria automotiva. Incluir dados de mercado, comparativo de maturidade digital entre montadoras, roadmap de 3 fases, e dashboard de KPIs esperados. Tom executivo, 15 minutos.'
                      : 'Ex.: Relatório executivo com business case. Para cada caso/hipótese, gerar slide com: Problema + Hipótese, Solução, Business Case completo (Investimento, VPL, ROI, TIR, Payback), e Potencial de Impacto.'
                  }
                />
              </div>

              {/* Attachments inline (if any) */}
              {(attachments.length > 0 || templatePptxBase64) && (
                <div className="px-4 pb-3 space-y-2">
                  {templatePptxBase64 && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-1.5">
                      <span className="text-green-600 text-xs">✅</span>
                      <p className="text-[11px] text-green-700 dark:text-green-400 font-medium flex-1 truncate">
                        Template PPTX: {templateFileName || 'template.pptx'} — layout preservado no export
                      </p>
                      <button
                        onClick={() => { setTemplatePptxBase64(null); setTemplateTextSummary(null); setTemplateFileName(null); }}
                        className="text-green-400 hover:text-red-500 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-nero-600 bg-gray-50 dark:bg-nero-800 px-3 py-1.5">
                      {att.type === 'image' && att.preview ? (
                        <div className="relative shrink-0">
                          <img src={att.preview} alt={att.name} className="h-8 w-8 rounded object-cover" />
                          {ocrProcessing === att.id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                              <Loader2 className="h-3 w-3 animate-spin text-white" />
                            </div>
                          )}
                          {att.content && ocrProcessing !== att.id && (
                            <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 text-[8px] text-white" title="OCR: texto extraído">
                              ✓
                            </div>
                          )}
                        </div>
                      ) : (
                        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300 truncate">{att.name}</p>
                        <input
                          type="text"
                          value={att.caption}
                          onChange={(e) => updateCaption(att.id, e.target.value)}
                          placeholder="Adicione contexto sobre este arquivo..."
                          className="w-full border-0 bg-transparent p-0 text-[10px] text-gray-400 dark:text-gray-500 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:ring-0"
                        />
                      </div>
                      <button onClick={() => removeAttachment(att.id)} className="shrink-0 p-0.5 text-gray-300 dark:text-gray-600 hover:text-red-500">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Toolbar — bottom bar with actions */}
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-nero-600 px-4 py-3 bg-gray-50/50 dark:bg-nero-800/50">
                {/* Left: attach + settings */}
                <div className="flex items-center gap-1">
                  {/* Attach button with popover */}
                  <div className="relative" ref={attachMenuRef}>
                    <button
                      onClick={() => setShowAttachMenu(!showAttachMenu)}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-nero-700 transition-colors"
                    >
                      {parsingPptx || ocrProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">{parsingPptx ? 'Processando PPTX...' : ocrProcessing ? 'OCR...' : 'Anexar'}</span>
                      {attachments.length > 0 && (
                        <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">{attachments.length}</span>
                      )}
                    </button>

                    {/* Attach popover menu */}
                    {showAttachMenu && (
                      <div className="absolute left-0 bottom-full mb-2 w-72 rounded-xl bg-white dark:bg-nero-800 border border-gray-200 dark:border-nero-600 shadow-2xl overflow-hidden z-50 animate-fade-in">
                        <button
                          onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-nero-700 transition-colors"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/30">
                            <Upload className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Fazer upload de arquivo</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {['pptx', 'txt', 'md', 'csv', 'json', 'png', 'jpg', 'webp', 'gif'].map((ext) => (
                                <span key={ext} className="inline-flex items-center rounded bg-gray-100 dark:bg-nero-700 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                  .{ext}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                        <div className="border-t border-gray-100 dark:border-nero-600 px-4 py-2.5">
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">
                            💡 Arraste arquivos ou cole imagens com Ctrl+V
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.txt,.md,.csv,.json,.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />

                  {/* Drop zone overlay — supports drag anywhere on card */}
                  <div className="h-5 border-l border-gray-300 dark:border-nero-500 mx-1" />

                  {/* Settings toggle */}
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      showAdvanced
                        ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-nero-700'
                    }`}
                  >
                    {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Ajustes</span>
                  </button>

                  {/* Inline info */}
                  <div className="hidden sm:flex items-center gap-3 ml-2 text-[11px] text-gray-400 dark:text-gray-500">
                    <span>{DURATION_PRESETS.find(d => d.value === duration)?.label || `${duration}min`}</span>
                    <span>•</span>
                    <span>{TONE_OPTIONS.find(t => t.value === tone)?.label || tone}</span>
                    {audience && <><span>•</span><span className="truncate max-w-[100px]">{audience}</span></>}
                  </div>
                </div>

                {/* Right: generate button */}
                <div className="flex items-center gap-2">
                  <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                    <Clock className="h-3 w-3" /> ~2min
                  </span>
                  <Button
                    onClick={handleGenerate}
                    disabled={!briefing.trim() || isRunning}
                    className="bg-[#FF5800] hover:bg-[#E04E00] shadow-lg shadow-[#FF5800]/20 px-5"
                  >
                    <Zap className="h-4 w-4" />
                    Forjar
                  </Button>
                </div>
              </div>

              {/* Expandable Settings Panel */}
              {showAdvanced && (
                <div className="border-t border-gray-200 dark:border-nero-600 px-4 py-4 space-y-4 animate-fade-in bg-gray-50/30 dark:bg-nero-800/30">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Audiência</label>
                      <select
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-nero-500 bg-white dark:bg-nero-800 px-3 py-1.5 text-xs dark:text-gray-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        <option value="">Detectar do briefing</option>
                        {AUDIENCE_SUGGESTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Duração</label>
                      <select
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 dark:border-nero-500 bg-white dark:bg-nero-800 px-3 py-1.5 text-xs dark:text-gray-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        {DURATION_PRESETS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Tom</label>
                      <select
                        value={tone}
                        onChange={(e) => setTone(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-nero-500 bg-white dark:bg-nero-800 px-3 py-1.5 text-xs dark:text-gray-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        {TONE_OPTIONS.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-1">Título (opcional)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-nero-500 bg-white dark:bg-nero-800 px-3 py-1.5 text-xs dark:text-gray-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      placeholder="Gerado automaticamente se vazio"
                    />
                  </div>
                </div>
              )}

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
                      className="flex flex-col gap-2 rounded-xl border border-gray-200 dark:border-nero-600 bg-white dark:bg-nero-800 p-4 text-left transition-all hover:border-brand-300 hover:shadow-sm"
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
                  className="rounded-lg p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-nero-700 hover:text-gray-600 dark:hover:text-gray-300"
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
                    className="bg-[#FF5800] text-white hover:bg-[#E04E00]"
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
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-nero-700">
                  <div
                    className="h-full rounded-full bg-[#FF5800] transition-all duration-500"
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
                        : 'border-gray-200 dark:border-nero-600 bg-white dark:bg-nero-800 hover:border-gray-300 dark:hover:border-nero-500'
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
                      {status === 'done' && (
                        <div className="flex items-center gap-1">
                          {state?.startedAt && state?.finishedAt && (
                            <span className="text-[10px] text-green-500 font-medium">{Math.round((state.finishedAt - state.startedAt) / 1000)}s</span>
                          )}
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                      {status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                      {status === 'idle' && <div className="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-nero-500" />}
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">{agent.description}</p>

                    {/* Compact summary — always visible when done */}
                    {status === 'done' && state?.output && (() => {
                      const { summary } = summarizeAgentOutput(agentId, state.output);
                      return (
                        <p className="text-[11px] font-medium text-green-700 dark:text-green-400 leading-snug truncate">
                          ✅ {summary}
                        </p>
                      );
                    })()}

                    {status === 'error' && state?.output && (
                      <p className="mt-1 text-[11px] text-red-600 leading-tight">
                        ⚠️ {state.output.slice(0, 120)}{state.output.length > 120 ? '...' : ''}
                      </p>
                    )}

                    {/* Expanded detail view — human-readable */}
                    {isExpanded && state?.output && status === 'done' && (() => {
                      const { details } = summarizeAgentOutput(agentId, state.output);
                      return (
                        <div className="mt-2 rounded-lg bg-white/80 dark:bg-nero-900/80 p-3 text-[11px] text-gray-600 dark:text-gray-300 max-h-56 overflow-y-auto border border-gray-200 dark:border-nero-600 space-y-1">
                          {details.map((line, idx) => (
                            <p key={idx} className="leading-snug">{line}</p>
                          ))}
                          <button
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(state.output); }}
                            className="mt-2 text-[10px] text-gray-400 hover:text-brand-500 underline"
                          >
                            Copiar JSON completo
                          </button>
                        </div>
                      );
                    })()}
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
                          : 'border-gray-200 dark:border-nero-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-nero-500'
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
                    quote: 'from-brand-600 to-brand-700',
                    closing: 'from-brand-700 to-brand-800',
                    'section-break': 'from-gray-800 to-gray-900',
                    'exec-report': 'from-white to-gray-50',
                  };
                  const gradient = layoutColors[slide.layoutType] || layoutColors.content;

                  // Special render for exec-report slides
                  if (slide.layoutType === 'exec-report' && slide.execData) {
                    const d = slide.execData;
                    return (
                      <div className="space-y-4">
                        <div className="relative aspect-video max-w-3xl rounded-2xl bg-white dark:bg-nero-800 border border-gray-200 dark:border-nero-600 p-4 sm:p-6 shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100">
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
                              <div className="rounded border border-dashed border-gray-300 dark:border-nero-500 p-2 text-center">
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
                    className="flex items-center gap-3 rounded-xl bg-[#FF5800] px-8 py-3.5 text-white font-semibold shadow-lg hover:shadow-xl hover:bg-[#E04E00] transition-all disabled:opacity-60"
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
                          <li key={i} className="text-sm text-gray-700 dark:text-gray-200 border-l-2 border-brand-300 dark:border-brand-600 pl-3">{m}</li>
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

export default function ForgePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>}>
      <ForgePageContent />
    </Suspense>
  );
}

'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useStore } from '@/lib/store';
import { Badge, Button, Card, Tabs, ProgressBar, MessageBar, Dialog, Input, Textarea } from '@/components/ui';
import { TurmasTab } from '@/components/workshops/TurmasTab';
import { MateriaisTab } from '@/components/workshops/MateriaisTab';
import { AgendaTab } from '@/components/workshops/AgendaTab';
import { FeedbackTab } from '@/components/workshops/FeedbackTab';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  Users,
  BookOpen,
  FileText,
  ListChecks,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Save,
  Eye,
} from 'lucide-react';
import {
  WORKSHOP_STATUS_LABELS,
  WORKSHOP_TYPE_LABELS,
  formatDuration,
  type WorkshopStatus,
} from '@/lib/types';

function getStatusBadgeVariant(status: WorkshopStatus) {
  switch (status) {
    case 'rascunho': return 'default' as const;
    case 'em_preparacao': return 'warning' as const;
    case 'agenda_aprovada': return 'success' as const;
    case 'concluido': return 'info' as const;
  }
}

export default function WorkshopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const {
    getWorkshopById,
    updateWorkshop,
    getTurmasByWorkshop,
    getBlocksByWorkshop,
    getMaterialsByWorkshop,
    getContext,
    saveContext,
    saveAsTemplate,
    getFeedbackByWorkshop,
  } = useStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showShareView, setShowShareView] = useState(false);

  const workshop = getWorkshopById(id);

  if (!workshop) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h2 className="text-lg font-semibold text-gray-900">Projeto não encontrado</h2>
          <Button variant="secondary" className="mt-4" onClick={() => router.push('/workshops')}>
            Voltar para Projetos
          </Button>
        </div>
      </AppLayout>
    );
  }

  const turmas = getTurmasByWorkshop(id);
  const blocks = getBlocksByWorkshop(id);
  const materials = getMaterialsByWorkshop(id);
  const context = getContext(id);
  const feedbacks = getFeedbackByWorkshop(id);

  const readyTurmas = turmas.filter((t) => t.status === 'pronta').length;
  const totalDuration = blocks.reduce((sum, b) => sum + b.duration, 0);
  const isOverTime = totalDuration > workshop.estimatedDuration;

  // Checklist
  const checklistItems = [
    { label: 'Definir datas das sessões', done: turmas.length > 0 && turmas.some((t) => t.date) },
    { label: 'Adicionar materiais principais', done: materials.length > 0 },
    { label: 'Configurar agenda/atividades', done: blocks.length > 0 },
    { label: 'Ao menos 1 sessão pronta', done: readyTurmas > 0 },
  ];
  const checklistDone = checklistItems.filter((i) => i.done).length;

  const canApprove = checklistDone === checklistItems.length;

  const handleStatusChange = (newStatus: WorkshopStatus) => {
    updateWorkshop(id, { status: newStatus });
    setSuccessMsg(`Status atualizado para "${WORKSHOP_STATUS_LABELS[newStatus]}".`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) return;
    saveAsTemplate(id, templateName, templateDesc);
    setShowSaveTemplate(false);
    setTemplateName('');
    setTemplateDesc('');
    setSuccessMsg('Template salvo com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'turmas', label: `Sessões (${turmas.length})`, icon: <Users className="h-4 w-4" /> },
    { id: 'agenda', label: `Agenda (${blocks.length})`, icon: <ListChecks className="h-4 w-4" /> },
    { id: 'materiais', label: `Materiais (${materials.length})`, icon: <FileText className="h-4 w-4" /> },
    { id: 'feedback', label: 'Pós-Workshop', icon: <MessageSquare className="h-4 w-4" /> },
  ];

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Breadcrumb & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => router.push('/workshops')}
              className="mt-1 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <button onClick={() => router.push('/workshops')} className="hover:text-brand-600">Projetos</button>
                <span>/</span>
                <span className="text-gray-700">{workshop.title}</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{workshop.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <Badge variant={getStatusBadgeVariant(workshop.status)}>
                  {WORKSHOP_STATUS_LABELS[workshop.status]}
                </Badge>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(workshop.targetDate).toLocaleDateString('pt-BR')}</span>
                <span>{WORKSHOP_TYPE_LABELS[workshop.type]}</span>
                <span>{workshop.clientArea}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatDuration(workshop.estimatedDuration)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setShowShareView(true)}>
              <Eye className="h-4 w-4" /> Resumo
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowSaveTemplate(true)}>
              <Save className="h-4 w-4" /> Salvar como Template
            </Button>
            {workshop.status === 'em_preparacao' && canApprove && (
              <Button size="sm" onClick={() => handleStatusChange('agenda_aprovada')}>
                <CheckCircle2 className="h-4 w-4" /> Marcar como Pronto
              </Button>
            )}
            {workshop.status === 'agenda_aprovada' && (
              <Button size="sm" variant="secondary" onClick={() => handleStatusChange('concluido')}>
                <CheckCircle2 className="h-4 w-4" /> Concluir Projeto
              </Button>
            )}
          </div>
        </div>

        {successMsg && <MessageBar type="success" onDismiss={() => setSuccessMsg('')}>{successMsg}</MessageBar>}

        {isOverTime && (
          <MessageBar type="warning">
            ⚠️ A duração total da agenda ({formatDuration(totalDuration)}) excede a duração planejada ({formatDuration(workshop.estimatedDuration)}).
          </MessageBar>
        )}

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        <div className="pt-2">
          {activeTab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Summary */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Resumo de Preparação</h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="text-center p-3 rounded-lg bg-gray-50">
                      <p className="text-2xl font-bold text-gray-900">{turmas.length}</p>
                      <p className="text-xs text-gray-500">Total de sessões</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-50">
                      <p className="text-2xl font-bold text-green-600">{readyTurmas}</p>
                      <p className="text-xs text-gray-500">Sessões prontas</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-gray-50">
                      <p className="text-2xl font-bold text-gray-900">{formatDuration(totalDuration)}</p>
                      <p className="text-xs text-gray-500">Duração da agenda</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <ProgressBar
                      value={readyTurmas}
                      max={turmas.length || 1}
                      label="Sessões prontas"
                    />
                  </div>
                </Card>

                {/* Context */}
                <Card className="p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Contexto e Objetivos</h3>
                  {context ? (
                    <div className="space-y-3 text-sm text-gray-700">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">Problema de Negócio</p>
                        <p>{context.businessProblem || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-1">Objetivo Principal</p>
                        <p>{context.mainObjective || '—'}</p>
                      </div>
                      {context.expectedOutputs.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Resultados Esperados</p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {context.expectedOutputs.map((o, i) => <li key={i}>{o}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Nenhum contexto definido ainda.</p>
                  )}
                </Card>
              </div>

              {/* Checklist */}
              <div>
                <Card className="p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Checklist de Preparação</h3>
                  <div className="space-y-3">
                    {checklistItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          item.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="text-xs">{i + 1}</span>}
                        </div>
                        <span className={`text-sm ${item.done ? 'text-gray-700 line-through' : 'text-gray-900'}`}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={checklistDone} max={checklistItems.length} label="Preparação" />
                  </div>
                </Card>

                {/* Quick info */}
                <Card className="mt-4 p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Informações</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Criado em</dt>
                      <dd className="text-gray-700">{new Date(workshop.createdAt).toLocaleDateString('pt-BR')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Atualizado</dt>
                      <dd className="text-gray-700">{new Date(workshop.updatedAt).toLocaleDateString('pt-BR')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Materiais</dt>
                      <dd className="text-gray-700">{materials.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Atividades</dt>
                      <dd className="text-gray-700">{blocks.length}</dd>
                    </div>
                    {workshop.templateId && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Template</dt>
                        <dd className="text-gray-700">✓ Baseado em template</dd>
                      </div>
                    )}
                  </dl>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'turmas' && <TurmasTab workshopId={id} />}
          {activeTab === 'agenda' && <AgendaTab workshopId={id} />}
          {activeTab === 'materiais' && <MateriaisTab workshopId={id} />}
          {activeTab === 'feedback' && <FeedbackTab workshopId={id} />}
        </div>
      </div>

      {/* Save as Template Dialog */}
      <Dialog
        open={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        title="Salvar como Template"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSaveTemplate(false)}>Cancelar</Button>
            <Button onClick={handleSaveAsTemplate} disabled={!templateName.trim()}>Salvar Template</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome do Template"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
            placeholder="Ex.: Template de Pitch Executivo"
          />
          <Textarea
            label="Descrição"
            value={templateDesc}
            onChange={(e) => setTemplateDesc(e.target.value)}
            placeholder="Descreva o propósito deste template..."
          />
        </div>
      </Dialog>

      {/* Shareable Summary View */}
      <Dialog
        open={showShareView}
        onClose={() => setShowShareView(false)}
        title="Resumo do Projeto"
        footer={<Button variant="secondary" onClick={() => setShowShareView(false)}>Fechar</Button>}
      >
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 text-lg">{workshop.title}</h4>
            <p className="text-gray-500">{workshop.clientArea} • {WORKSHOP_TYPE_LABELS[workshop.type]}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Data</p>
            <p>{new Date(workshop.targetDate).toLocaleDateString('pt-BR')} • {formatDuration(workshop.estimatedDuration)}</p>
          </div>
          {context?.mainObjective && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Objetivo</p>
              <p>{context.mainObjective}</p>
            </div>
          )}
          {blocks.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Agenda</p>
              <div className="space-y-1">
                {blocks.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                    <span>{b.title}</span>
                    <span className="text-gray-400">{formatDuration(b.duration)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </AppLayout>
  );
}

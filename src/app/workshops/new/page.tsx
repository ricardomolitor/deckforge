'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { useStore } from '@/lib/store';
import { Button, Input, Select, Textarea, MessageBar, Card } from '@/components/ui';
import { ArrowLeft, Sparkles, Check, Users, GraduationCap, TrendingUp, FileText, Target, MoreHorizontal } from 'lucide-react';
import {
  WORKSHOP_TYPE_LABELS,
  PRESENTATION_CATEGORY_LABELS,
  CATEGORY_TYPES,
  type WorkshopType,
  type WorkshopLocation,
  type PresentationCategory,
  type CreateWorkshopDTO,
} from '@/lib/types';

export default function NewWorkshopPage() {
  const { createWorkshop, templates } = useStore();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateWorkshopDTO>({
    title: '',
    type: 'discovery' as WorkshopType,
    clientArea: '',
    targetDate: '',
    estimatedDuration: 480,
    location: 'presencial' as WorkshopLocation,
    templateId: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PresentationCategory | null>(null);

  const CATEGORY_ICONS: Record<PresentationCategory, React.ReactNode> = {
    workshop: <Users className="h-5 w-5" />,
    treinamento: <GraduationCap className="h-5 w-5" />,
    venda: <TrendingUp className="h-5 w-5" />,
    proposta: <FileText className="h-5 w-5" />,
    pitch: <Target className="h-5 w-5" />,
    outro: <MoreHorizontal className="h-5 w-5" />,
  };

  const CATEGORY_COLORS: Record<PresentationCategory, string> = {
    workshop: 'bg-blue-100 text-blue-600 border-blue-200',
    treinamento: 'bg-purple-100 text-purple-600 border-purple-200',
    venda: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    proposta: 'bg-orange-100 text-orange-600 border-orange-200',
    pitch: 'bg-pink-100 text-pink-600 border-pink-200',
    outro: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const updateField = <K extends keyof CreateWorkshopDTO>(field: K, value: CreateWorkshopDTO[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Informe o título do workshop.';
    if (!form.type) errs.type = 'Selecione o tipo do workshop.';
    if (!form.targetDate) errs.targetDate = 'Informe a data alvo.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));

    const ws = createWorkshop({
      ...form,
      templateId: selectedTemplateId || undefined,
    });
    setSaving(false);
    router.push(`/workshops/${ws.id}`);
  };

  const typeOptions = selectedCategory
    ? CATEGORY_TYPES[selectedCategory].map(t => ({ value: t, label: WORKSHOP_TYPE_LABELS[t] }))
    : Object.entries(WORKSHOP_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  const locationOptions = [
    { value: 'presencial', label: 'Presencial' },
    { value: 'online', label: 'Online' },
    { value: 'hibrido', label: 'Híbrido' },
  ];
  const durationOptions = [
    { value: '60', label: '1 hora' },
    { value: '90', label: '1h30min' },
    { value: '120', label: '2 horas' },
    { value: '180', label: '3 horas' },
    { value: '240', label: '4 horas (meio dia)' },
    { value: '480', label: '8 horas (dia inteiro)' },
    { value: '960', label: '2 dias' },
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Novo Projeto</h1>
            <p className="text-sm text-gray-500">Passo {step} de 2</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-brand-600' : 'bg-gray-200'}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-brand-600' : 'bg-gray-200'}`} />
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Informações Básicas</h2>
              <p className="text-sm text-gray-500">Escolha a categoria e defina os dados do projeto.</p>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {(Object.keys(PRESENTATION_CATEGORY_LABELS) as PresentationCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(selectedCategory === cat ? null : cat);
                      const types = CATEGORY_TYPES[cat];
                      if (types.length > 0 && selectedCategory !== cat) {
                        updateField('type', types[0]);
                      }
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${
                      selectedCategory === cat
                        ? `${CATEGORY_COLORS[cat]} border-current shadow-sm`
                        : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
                    }`}
                  >
                    {CATEGORY_ICONS[cat]}
                    <span className="text-[11px] font-medium">{PRESENTATION_CATEGORY_LABELS[cat]}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Título do Projeto"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              error={errors.title}
              required
              placeholder="Ex.: Pitch Executivo - Plataforma de IA"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Tipo / Formato"
                value={form.type}
                onChange={(e) => updateField('type', e.target.value as WorkshopType)}
                options={typeOptions}
                error={errors.type}
                required
              />

              <Select
                label="Local"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value as WorkshopLocation)}
                options={locationOptions}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Data Alvo"
                type="date"
                value={form.targetDate}
                onChange={(e) => updateField('targetDate', e.target.value)}
                error={errors.targetDate}
                required
              />

              <Select
                label="Duração Estimada"
                value={String(form.estimatedDuration)}
                onChange={(e) => updateField('estimatedDuration', Number(e.target.value))}
                options={durationOptions}
              />
            </div>

            <Input
              label="Cliente / Time / Área"
              value={form.clientArea}
              onChange={(e) => updateField('clientArea', e.target.value)}
              placeholder="Ex.: Acme Insurance"
            />

            <div className="flex justify-end">
              <Button onClick={handleNext}>
                Próximo
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Template Selection */}
        {step === 2 && (
          <Card className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Escolher Template</h2>
              <p className="text-sm text-gray-500">
                Use um template pronto para começar com agenda e materiais pré-definidos, ou crie do zero.
              </p>
            </div>

            {/* No template option */}
            <button
              onClick={() => setSelectedTemplateId(null)}
              className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                selectedTemplateId === null
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  selectedTemplateId === null ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {selectedTemplateId === null ? <Check className="h-4 w-4" /> : <span className="text-sm">∅</span>}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Começar do zero</p>
                  <p className="text-xs text-gray-500">Crie a agenda manualmente</p>
                </div>
              </div>
            </button>

            {/* Templates */}
            <div className="space-y-2">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                    selectedTemplateId === tpl.id
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      selectedTemplateId === tpl.id ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {selectedTemplateId === tpl.id ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tpl.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{tpl.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                        <span>{tpl.blocks.length} atividades</span>
                        <span>•</span>
                        <span>{Math.round(tpl.estimatedDuration / 60)}h duração</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button onClick={handleCreate} loading={saving}>
                Criar Projeto
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

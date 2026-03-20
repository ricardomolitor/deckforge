'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { LayoutTemplate, Plus, Clock, ListChecks, Sparkles } from 'lucide-react';
import { WORKSHOP_TYPE_LABELS, PRESENTATION_CATEGORY_LABELS, TYPE_TO_CATEGORY, formatDuration } from '@/lib/types';
import type { PresentationCategory } from '@/lib/types';

export default function TemplatesPage() {
  const { templates } = useStore();
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState<PresentationCategory | null>(null);

  const filtered = categoryFilter
    ? templates.filter(tpl => TYPE_TO_CATEGORY[tpl.workshopType] === categoryFilter)
    : templates;

  const CATEGORY_COLORS: Record<PresentationCategory, string> = {
    workshop: 'border-blue-500 bg-blue-50 text-blue-700',
    treinamento: 'border-purple-500 bg-purple-50 text-purple-700',
    venda: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    proposta: 'border-orange-500 bg-orange-50 text-orange-700',
    pitch: 'border-pink-500 bg-pink-50 text-pink-700',
    outro: 'border-gray-500 bg-gray-50 text-gray-700',
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
            <p className="mt-1 text-sm text-gray-500">
              Biblioteca de templates para qualquer tipo de apresentação
            </p>
          </div>
          <Button onClick={() => router.push('/workshops/new')}>
            <Plus className="h-4 w-4" />
            Criar com Template
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === null
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Todos ({templates.length})
          </button>
          {(Object.keys(PRESENTATION_CATEGORY_LABELS) as PresentationCategory[]).map((cat) => {
            const count = templates.filter(t => TYPE_TO_CATEGORY[t.workshopType] === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? CATEGORY_COLORS[cat]
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {PRESENTATION_CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>

        {/* Template Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<LayoutTemplate className="h-12 w-12" />}
            title={categoryFilter ? 'Nenhum template nesta categoria' : 'Nenhum template disponível'}
            description={categoryFilter ? 'Tente selecionar outra categoria.' : 'Crie um projeto e salve como template para reutilização.'}
            action={
              categoryFilter ? (
                <Button variant="ghost" size="sm" onClick={() => setCategoryFilter(null)}>
                  Ver todos
                </Button>
              ) : (
                <Button size="sm" onClick={() => router.push('/workshops/new')}>
                  <Plus className="h-4 w-4" /> Criar Projeto
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tpl) => {
              const cat = TYPE_TO_CATEGORY[tpl.workshopType];
              const iconColors: Record<PresentationCategory, string> = {
                workshop: 'bg-blue-100 text-blue-600',
                treinamento: 'bg-purple-100 text-purple-600',
                venda: 'bg-emerald-100 text-emerald-600',
                proposta: 'bg-orange-100 text-orange-600',
                pitch: 'bg-pink-100 text-pink-600',
                outro: 'bg-gray-100 text-gray-600',
              };
              return (
              <Card key={tpl.id} className="p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconColors[cat]}`}>
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{tpl.name}</h3>
                    <Badge variant="default" className="mt-1">
                      {WORKSHOP_TYPE_LABELS[tpl.workshopType] || tpl.workshopType}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-1">
                  {tpl.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-3">
                  <span className="flex items-center gap-1">
                    <ListChecks className="h-3.5 w-3.5" />
                    {tpl.blocks.length} atividades
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(tpl.estimatedDuration)}
                  </span>
                </div>

                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push('/workshops/new')}
                  >
                    Usar Template
                  </Button>
                </div>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

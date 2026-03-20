'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button, Dialog, Input, Select, Textarea, EmptyState, MessageBar, Badge, Card } from '@/components/ui';
import { Plus, Edit3, Trash2, GripVertical, Clock, ListChecks, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import {
  ACTIVITY_TYPE_LABELS,
  BLOCK_TYPE_LABELS,
  formatDuration,
  type BlockType,
  type ActivityType,
  type CreateBlockDTO,
} from '@/lib/types';

interface AgendaTabProps {
  workshopId: string;
}

export function AgendaTab({ workshopId }: AgendaTabProps) {
  const { getBlocksByWorkshop, getWorkshopById, createBlock, updateBlock, deleteBlock, reorderBlocks } = useStore();
  const blocks = getBlocksByWorkshop(workshopId);
  const workshop = getWorkshopById(workshopId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateBlockDTO>({
    workshopId,
    title: '',
    description: '',
    objective: '',
    duration: 30,
    blockType: 'atividade',
    activityType: 'apresentacao',
    order: 0,
    materialIds: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const totalDuration = blocks.reduce((sum, b) => sum + b.duration, 0);
  const isOverTime = workshop ? totalDuration > workshop.estimatedDuration : false;

  const openNewDialog = () => {
    setEditingId(null);
    setForm({
      workshopId,
      title: '',
      description: '',
      objective: '',
      duration: 30,
      blockType: 'atividade',
      activityType: 'apresentacao',
      order: blocks.length,
      materialIds: [],
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (blockId: string) => {
    const b = blocks.find((b) => b.id === blockId);
    if (!b) return;
    setEditingId(blockId);
    setForm({
      workshopId,
      title: b.title,
      description: b.description,
      objective: b.objective,
      duration: b.duration,
      blockType: b.blockType,
      activityType: b.activityType,
      order: b.order,
      materialIds: b.materialIds,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Informe o título da atividade.';
    if (form.duration <= 0) errs.duration = 'Informe uma duração válida.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (editingId) {
      updateBlock(editingId, {
        title: form.title,
        description: form.description,
        objective: form.objective,
        duration: form.duration,
        blockType: form.blockType,
        activityType: form.activityType,
        materialIds: form.materialIds,
      });
      setSuccessMsg('Atividade atualizada.');
    } else {
      createBlock(form);
      setSuccessMsg('Atividade adicionada.');
    }
    setDialogOpen(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = (blockId: string) => {
    deleteBlock(blockId);
    setDeleteConfirm(null);
    setSuccessMsg('Atividade removida.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const newBlocks = [...blocks];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newBlocks.length) return;
    [newBlocks[idx], newBlocks[targetIdx]] = [newBlocks[targetIdx], newBlocks[idx]];
    reorderBlocks(workshopId, newBlocks.map((b) => b.id));
  };

  const blockTypeOptions = Object.entries(BLOCK_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
  const activityTypeOptions = Object.entries(ACTIVITY_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));

  const getBlockColor = (type: BlockType) => {
    switch (type) {
      case 'atividade': return 'border-l-brand-500 bg-white';
      case 'pausa': return 'border-l-gray-400 bg-gray-50';
      case 'wrap_up': return 'border-l-green-500 bg-green-50/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Command Bar */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={openNewDialog}>
            <Plus className="h-4 w-4" /> Adicionar Atividade
          </Button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className={`flex items-center gap-1 font-medium ${isOverTime ? 'text-red-600' : 'text-gray-600'}`}>
            <Clock className="h-3.5 w-3.5" />
            Total: {formatDuration(totalDuration)}
            {workshop && <span className="text-gray-400 font-normal"> / {formatDuration(workshop.estimatedDuration)}</span>}
          </span>
          {isOverTime && <AlertTriangle className="h-4 w-4 text-red-500" />}
        </div>
      </div>

      {successMsg && <MessageBar type="success" onDismiss={() => setSuccessMsg('')}>{successMsg}</MessageBar>}

      {isOverTime && (
        <MessageBar type="warning">
          A duração total da agenda excede o tempo planejado do workshop.
        </MessageBar>
      )}

      {/* Blocks Timeline */}
      {blocks.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-12 w-12" />}
          title="Nenhuma atividade definida para este workshop"
          description="Monte a agenda adicionando blocos de atividades, pausas e wrap-ups."
          action={<Button size="sm" onClick={openNewDialog}><Plus className="h-4 w-4" /> Adicionar atividade</Button>}
        />
      ) : (
        <div className="space-y-2">
          {/* Timeline start indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-400 pl-10">
            <div className="h-px flex-1 bg-gray-200" />
            <span>Início</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {blocks.map((block, idx) => {
            // Calculate cumulative time
            const startMinutes = blocks.slice(0, idx).reduce((s, b) => s + b.duration, 0);
            const startHours = Math.floor(startMinutes / 60);
            const startMins = startMinutes % 60;
            const timeLabel = `${String(startHours).padStart(2, '0')}:${String(startMins).padStart(2, '0')}`;

            return (
              <div
                key={block.id}
                className={`flex items-stretch gap-3 rounded-lg border border-l-4 p-4 transition-colors hover:shadow-sm ${getBlockColor(block.blockType)}`}
              >
                {/* Time label */}
                <div className="flex flex-col items-center justify-center w-14 shrink-0">
                  <span className="text-xs font-mono text-gray-400">+{timeLabel}</span>
                  <span className="text-xs text-gray-500 font-medium">{formatDuration(block.duration)}</span>
                </div>

                {/* Move buttons */}
                <div className="flex flex-col justify-center gap-1">
                  <button
                    onClick={() => moveBlock(block.id, 'up')}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    aria-label="Mover para cima"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveBlock(block.id, 'down')}
                    disabled={idx === blocks.length - 1}
                    className="rounded p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    aria-label="Mover para baixo"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900">{block.title}</h4>
                    <Badge variant={block.blockType === 'pausa' ? 'default' : block.blockType === 'wrap_up' ? 'success' : 'info'}>
                      {ACTIVITY_TYPE_LABELS[block.activityType]}
                    </Badge>
                  </div>
                  {block.description && (
                    <p className="mt-0.5 text-xs text-gray-500 truncate">{block.description}</p>
                  )}
                  {block.objective && (
                    <p className="mt-0.5 text-xs text-gray-400">Objetivo: {block.objective}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditDialog(block.id)}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Editar atividade"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(block.id)}
                    className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remover atividade"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Timeline end indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-400 pl-10">
            <div className="h-px flex-1 bg-gray-200" />
            <span>Fim • {formatDuration(totalDuration)}</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingId ? 'Editar Atividade' : 'Nova Atividade'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Adicionar'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Título da Atividade"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            error={errors.title}
            required
            placeholder="Ex.: Brainstorming de ideias"
          />

          <Textarea
            label="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descreva brevemente a atividade..."
          />

          <div className="grid gap-4 grid-cols-2">
            <Select
              label="Tipo do Bloco"
              value={form.blockType}
              onChange={(e) => setForm({ ...form, blockType: e.target.value as BlockType })}
              options={blockTypeOptions}
            />
            <Select
              label="Tipo de Atividade"
              value={form.activityType}
              onChange={(e) => setForm({ ...form, activityType: e.target.value as ActivityType })}
              options={activityTypeOptions}
            />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <Input
              label="Duração (minutos)"
              type="number"
              min="5"
              max="480"
              value={String(form.duration)}
              onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
              error={errors.duration}
            />
            <Input
              label="Objetivo"
              value={form.objective}
              onChange={(e) => setForm({ ...form, objective: e.target.value })}
              placeholder="Ex.: Gerar 20+ ideias"
            />
          </div>
        </div>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remover Atividade"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Remover</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Tem certeza que deseja remover esta atividade da agenda?</p>
      </Dialog>
    </div>
  );
}

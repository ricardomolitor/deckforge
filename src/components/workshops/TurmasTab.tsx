'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Badge, Button, Panel, Input, Select, EmptyState, MessageBar, Dialog } from '@/components/ui';
import { Plus, Copy, Edit3, Trash2, MapPin, Clock, Calendar, Users, MoreHorizontal } from 'lucide-react';
import { TURMA_STATUS_LABELS, formatDuration, type TurmaStatus, type CreateTurmaDTO } from '@/lib/types';

function getBadgeVariant(status: TurmaStatus) {
  switch (status) {
    case 'rascunho': return 'default' as const;
    case 'em_preparacao': return 'warning' as const;
    case 'pronta': return 'success' as const;
    case 'concluida': return 'info' as const;
  }
}

interface TurmasTabProps {
  workshopId: string;
}

const emptyForm: CreateTurmaDTO = {
  workshopId: '',
  name: '',
  date: '',
  time: '',
  duration: 480,
  locationType: 'presencial',
  locationValue: '',
};

export function TurmasTab({ workshopId }: TurmasTabProps) {
  const { getTurmasByWorkshop, createTurma, updateTurma, deleteTurma, duplicateTurma } = useStore();
  const turmas = getTurmasByWorkshop(workshopId);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateTurmaDTO>({ ...emptyForm, workshopId });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TurmaStatus | ''>('');

  const openNewPanel = () => {
    setEditingId(null);
    setForm({ ...emptyForm, workshopId });
    setErrors({});
    setPanelOpen(true);
  };

  const openEditPanel = (turmaId: string) => {
    const t = turmas.find((t) => t.id === turmaId);
    if (!t) return;
    setEditingId(turmaId);
    setForm({
      workshopId,
      name: t.name,
      date: t.date,
      time: t.time,
      duration: t.duration,
      locationType: t.locationType,
      locationValue: t.locationValue,
    });
    setErrors({});
    setPanelOpen(true);
    setMenuOpen(null);
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Informe o nome da turma.';
    if (!form.date) errs.date = 'Informe a data.';
    if (!form.time) errs.time = 'Informe o horário.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (editingId) {
      updateTurma(editingId, {
        name: form.name,
        date: form.date,
        time: form.time,
        duration: form.duration,
        locationType: form.locationType,
        locationValue: form.locationValue,
      });
      setSuccessMsg('Turma atualizada com sucesso.');
    } else {
      createTurma(form);
      setSuccessMsg('Turma criada com sucesso.');
    }
    setPanelOpen(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = (turmaId: string) => {
    deleteTurma(turmaId);
    setDeleteConfirm(null);
    setSuccessMsg('Turma excluída.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDuplicate = (turmaId: string) => {
    duplicateTurma(turmaId);
    setMenuOpen(null);
    setSuccessMsg('Turma duplicada com sucesso.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleMarkReady = (turmaId: string) => {
    updateTurma(turmaId, { status: 'pronta' });
    setMenuOpen(null);
    setSuccessMsg('Turma marcada como pronta.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const filteredTurmas = statusFilter
    ? turmas.filter((t) => t.status === statusFilter)
    : turmas;

  const durationOptions = [
    { value: '60', label: '1 hora' },
    { value: '90', label: '1h30min' },
    { value: '120', label: '2 horas' },
    { value: '180', label: '3 horas' },
    { value: '240', label: '4 horas' },
    { value: '480', label: '8 horas (dia inteiro)' },
  ];

  return (
    <div className="space-y-4">
      {/* Command Bar */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openNewPanel}>
            <Plus className="h-4 w-4" /> Adicionar Turma
          </Button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TurmaStatus | '')}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 focus:border-brand-500 focus:outline-none"
          >
            <option value="">Todos os status</option>
            {(Object.keys(TURMA_STATUS_LABELS) as TurmaStatus[]).map((s) => (
              <option key={s} value={s}>{TURMA_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-gray-500">{filteredTurmas.length} turma(s)</span>
      </div>

      {successMsg && <MessageBar type="success" onDismiss={() => setSuccessMsg('')}>{successMsg}</MessageBar>}

      {/* Turmas List */}
      {filteredTurmas.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Nenhuma turma configurada para este workshop"
          description="Adicione uma turma com data, horário e local."
          action={<Button size="sm" onClick={openNewPanel}><Plus className="h-4 w-4" /> Adicionar primeira turma</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Data e Hora</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Duração</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Local</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="w-20 px-4 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTurmas.map((turma) => (
                <tr key={turma.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => openEditPanel(turma.id)} className="text-left group">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600">{turma.name}</p>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="h-3.5 w-3.5" />
                      {turma.date ? new Date(turma.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      {turma.time && ` às ${turma.time}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(turma.duration)}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="h-3.5 w-3.5" />
                      {turma.locationType === 'online' ? 'Online' : turma.locationValue || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getBadgeVariant(turma.status)}>
                      {TURMA_STATUS_LABELS[turma.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === turma.id ? null : turma.id)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Ações da turma"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuOpen === turma.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 z-40 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                            <button onClick={() => openEditPanel(turma.id)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Edit3 className="h-3.5 w-3.5" /> Editar
                            </button>
                            <button onClick={() => handleDuplicate(turma.id)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                              <Copy className="h-3.5 w-3.5" /> Duplicar
                            </button>
                            {turma.status !== 'pronta' && (
                              <button onClick={() => handleMarkReady(turma.id)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50">
                                ✓ Marcar como Pronta
                              </button>
                            )}
                            <button onClick={() => { setDeleteConfirm(turma.id); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" /> Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Panel */}
      <Panel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editingId ? 'Editar Turma' : 'Nova Turma'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPanelOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar Alterações' : 'Salvar'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome da Turma"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            required
            placeholder="Ex.: Turma 1 - São Paulo"
          />

          <div className="grid gap-4 grid-cols-2">
            <Input
              label="Data"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              error={errors.date}
              required
            />
            <Input
              label="Horário"
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              error={errors.time}
              required
            />
          </div>

          <Select
            label="Duração"
            value={String(form.duration)}
            onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
            options={durationOptions}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Local</label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="locationType"
                  checked={form.locationType === 'presencial'}
                  onChange={() => setForm({ ...form, locationType: 'presencial', locationValue: '' })}
                  className="text-brand-600 focus:ring-brand-500"
                />
                Presencial
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="locationType"
                  checked={form.locationType === 'online'}
                  onChange={() => setForm({ ...form, locationType: 'online', locationValue: '' })}
                  className="text-brand-600 focus:ring-brand-500"
                />
                Online
              </label>
            </div>
            <Input
              value={form.locationValue}
              onChange={(e) => setForm({ ...form, locationValue: e.target.value })}
              placeholder={form.locationType === 'online' ? 'Cole o link da reunião' : 'Endereço do local'}
            />
          </div>
        </div>
      </Panel>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir Turma"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Tem certeza que deseja excluir esta turma? Essa ação não pode ser desfeita.
        </p>
      </Dialog>
    </div>
  );
}

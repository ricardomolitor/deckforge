'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button, Panel, Input, Select, EmptyState, MessageBar, Dialog, Badge } from '@/components/ui';
import { Plus, Edit3, Trash2, ExternalLink, FileText, Link2 } from 'lucide-react';
import { MATERIAL_PHASE_LABELS, type MaterialType, type MaterialPhase, type CreateMaterialDTO } from '@/lib/types';

interface MateriaisTabProps {
  workshopId: string;
}

export function MateriaisTab({ workshopId }: MateriaisTabProps) {
  const { getMaterialsByWorkshop, getTurmasByWorkshop, createMaterial, updateMaterial, deleteMaterial } = useStore();
  const materials = getMaterialsByWorkshop(workshopId);
  const turmas = getTurmasByWorkshop(workshopId);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateMaterialDTO>({
    workshopId,
    name: '',
    type: 'link' as MaterialType,
    phase: 'durante' as MaterialPhase,
    url: '',
    fileName: '',
    applyToAll: true,
    turmaIds: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openNewPanel = () => {
    setEditingId(null);
    setForm({
      workshopId,
      name: '',
      type: 'link',
      phase: 'durante',
      url: '',
      fileName: '',
      applyToAll: true,
      turmaIds: [],
    });
    setErrors({});
    setPanelOpen(true);
  };

  const openEditPanel = (matId: string) => {
    const m = materials.find((m) => m.id === matId);
    if (!m) return;
    setEditingId(matId);
    setForm({
      workshopId,
      name: m.name,
      type: m.type,
      phase: m.phase,
      url: m.url || '',
      fileName: m.fileName || '',
      applyToAll: m.applyToAll,
      turmaIds: m.turmaIds,
    });
    setErrors({});
    setPanelOpen(true);
  };

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Informe o nome do material.';
    if (form.type === 'link' && !form.url?.trim()) errs.url = 'Informe a URL.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (editingId) {
      updateMaterial(editingId, {
        name: form.name,
        type: form.type,
        phase: form.phase,
        url: form.url,
        fileName: form.fileName,
        applyToAll: form.applyToAll,
        turmaIds: form.turmaIds,
      });
      setSuccessMsg('Material atualizado com sucesso.');
    } else {
      createMaterial(form);
      setSuccessMsg('Material adicionado com sucesso.');
    }
    setPanelOpen(false);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDelete = (matId: string) => {
    deleteMaterial(matId);
    setDeleteConfirm(null);
    setSuccessMsg('Material removido.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const typeOptions = [
    { value: 'link', label: 'Link (URL)' },
    { value: 'arquivo', label: 'Arquivo' },
    { value: 'outro', label: 'Outro' },
  ];

  const phaseOptions = Object.entries(MATERIAL_PHASE_LABELS).map(([v, l]) => ({ value: v, label: l }));

  const getTypeIcon = (type: MaterialType) => {
    switch (type) {
      case 'link': return <Link2 className="h-4 w-4 text-blue-500" />;
      case 'arquivo': return <FileText className="h-4 w-4 text-orange-500" />;
      default: return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Command Bar */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
        <Button size="sm" onClick={openNewPanel}>
          <Plus className="h-4 w-4" /> Adicionar Material
        </Button>
        <span className="text-xs text-gray-500">{materials.length} material(is)</span>
      </div>

      {successMsg && <MessageBar type="success" onDismiss={() => setSuccessMsg('')}>{successMsg}</MessageBar>}

      {/* Materials List */}
      {materials.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Nenhum material cadastrado ainda"
          description="Adicione links, arquivos ou documentos ao workshop."
          action={<Button size="sm" onClick={openNewPanel}><Plus className="h-4 w-4" /> Adicionar material</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Material</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Fase</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Aplicado a</th>
                <th className="w-24 px-4 py-3"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {materials.map((mat) => (
                <tr key={mat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(mat.type)}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{mat.name}</p>
                        {mat.url && (
                          <a href={mat.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
                            <ExternalLink className="h-3 w-3" /> Abrir link
                          </a>
                        )}
                        {mat.fileName && <p className="text-xs text-gray-500">{mat.fileName}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{mat.type}</td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{MATERIAL_PHASE_LABELS[mat.phase]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {mat.applyToAll ? 'Todas as turmas' : `${mat.turmaIds.length} turma(s)`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditPanel(mat.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Editar">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(mat.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
        title={editingId ? 'Editar Material' : 'Novo Material'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPanelOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Salvar' : 'Adicionar'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome do Material"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
            required
            placeholder="Ex.: Deck de Contexto"
          />

          <div className="grid gap-4 grid-cols-2">
            <Select
              label="Tipo"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as MaterialType })}
              options={typeOptions}
            />
            <Select
              label="Fase"
              value={form.phase}
              onChange={(e) => setForm({ ...form, phase: e.target.value as MaterialPhase })}
              options={phaseOptions}
            />
          </div>

          {form.type === 'link' && (
            <Input
              label="URL"
              type="url"
              value={form.url || ''}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              error={errors.url}
              placeholder="https://..."
            />
          )}

          {form.type === 'arquivo' && (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
              <FileText className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">Arraste e solte aqui ou clique para enviar</p>
              <p className="text-xs text-gray-400 mt-1">PDF, PPT, DOCX até 10MB</p>
              <input
                type="file"
                className="mt-2 text-xs"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setForm({ ...form, fileName: file.name });
                }}
              />
            </div>
          )}

          {/* Apply to */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aplicar a</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={form.applyToAll}
                  onChange={() => setForm({ ...form, applyToAll: true, turmaIds: [] })}
                  className="text-brand-600 focus:ring-brand-500"
                />
                Todas as turmas deste workshop
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  checked={!form.applyToAll}
                  onChange={() => setForm({ ...form, applyToAll: false })}
                  className="text-brand-600 focus:ring-brand-500"
                />
                Selecionar turmas específicas
              </label>
            </div>
            {!form.applyToAll && turmas.length > 0 && (
              <div className="mt-2 ml-6 space-y-1">
                {turmas.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={form.turmaIds.includes(t.id)}
                      onChange={(e) => {
                        const ids = e.target.checked
                          ? [...form.turmaIds, t.id]
                          : form.turmaIds.filter((id) => id !== t.id);
                        setForm({ ...form, turmaIds: ids });
                      }}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    {t.name} {t.date && `(${new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')})`}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remover Material"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Remover</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Tem certeza que deseja remover este material?</p>
      </Dialog>
    </div>
  );
}

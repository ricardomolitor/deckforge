'use client';

import AppLayout from '@/components/layout/AppLayout';
import { useStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge, Button, Dialog, EmptyState, Input, MessageBar } from '@/components/ui';
import {
  Plus,
  Copy,
  Filter,
  Search,
  Calendar,
  MapPin,
  Clock,
  BookOpen,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  WORKSHOP_STATUS_LABELS,
  WORKSHOP_TYPE_LABELS,
  formatDuration,
} from '@/lib/types';
import type { WorkshopStatus, Workshop } from '@/lib/types';

function getStatusBadgeVariant(status: WorkshopStatus) {
  switch (status) {
    case 'rascunho': return 'default' as const;
    case 'em_preparacao': return 'warning' as const;
    case 'agenda_aprovada': return 'success' as const;
    case 'concluido': return 'info' as const;
  }
}

type SortField = 'title' | 'targetDate' | 'status';
type SortDirection = 'asc' | 'desc';

export default function WorkshopsPage() {
  const { workshops, turmas, duplicateWorkshop } = useStore();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkshopStatus[]>([]);
  const [sortField, setSortField] = useState<SortField>('targetDate');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [dupIncludeTurmas, setDupIncludeTurmas] = useState(true);
  const [dupIncludeMaterials, setDupIncludeMaterials] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // Filter & Sort
  let filtered = workshops.filter((ws) => {
    if (search && !ws.title.toLowerCase().includes(search.toLowerCase()) && !ws.clientArea.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter.length > 0 && !statusFilter.includes(ws.status)) {
      return false;
    }
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'title') cmp = a.title.localeCompare(b.title);
    if (sortField === 'targetDate') cmp = new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
    if (sortField === 'status') cmp = a.status.localeCompare(b.status);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  const handleDuplicate = () => {
    if (!selectedId || !duplicateName) return;
    const ws = duplicateWorkshop(selectedId, duplicateName, dupIncludeTurmas, dupIncludeMaterials);
    setShowDuplicateDialog(false);
    setSelectedId(null);
    setSuccessMsg(`Workshop "${ws.title}" duplicado com sucesso!`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const openDuplicateDialog = (wsId: string) => {
    const ws = workshops.find((w) => w.id === wsId);
    if (ws) {
      setSelectedId(wsId);
      setDuplicateName(`Cópia de ${ws.title}`);
      setDupIncludeTurmas(true);
      setDupIncludeMaterials(true);
      setShowDuplicateDialog(true);
    }
  };

  const toggleStatus = (status: WorkshopStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie seus projetos e apresentações
            </p>
          </div>
          <Button onClick={() => router.push('/workshops/new')}>
            <Plus className="h-4 w-4" />
            Novo Projeto
          </Button>
        </div>

        {successMsg && <MessageBar type="success" onDismiss={() => setSuccessMsg('')}>{successMsg}</MessageBar>}

        {/* Command Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-lg border border-gray-200 bg-white p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou cliente/área..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filtros
              {statusFilter.length > 0 && (
                <span className="ml-1 rounded-full bg-brand-100 px-1.5 py-0.5 text-xs font-medium text-brand-700">
                  {statusFilter.length}
                </span>
              )}
            </Button>
            {selectedId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openDuplicateDialog(selectedId)}
              >
                <Copy className="h-4 w-4" />
                Duplicar
              </Button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Filtrar por Status</h3>
              {statusFilter.length > 0 && (
                <button
                  onClick={() => setStatusFilter([])}
                  className="text-xs text-brand-600 hover:text-brand-700"
                >
                  Limpar filtros
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(WORKSHOP_STATUS_LABELS) as WorkshopStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatus(status)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter.includes(status)
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {WORKSHOP_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-12 w-12" />}
            title={search || statusFilter.length > 0 ? 'Nenhum projeto encontrado com esses filtros' : 'Você ainda não tem projetos criados'}
            description={search || statusFilter.length > 0 ? 'Tente ajustar os filtros de busca.' : 'Crie seu primeiro projeto para começar.'}
            action={
              search || statusFilter.length > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatusFilter([]); }}>
                  Limpar filtros
                </Button>
              ) : (
                <Button size="sm" onClick={() => router.push('/workshops/new')}>
                  <Plus className="h-4 w-4" /> Criar primeiro projeto
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="w-10 px-4 py-3">
                    <span className="sr-only">Selecionar</span>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort('title')}
                  >
                    <span className="flex items-center gap-1">
                      Nome <SortIcon field="title" />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Turmas
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort('status')}
                  >
                    <span className="flex items-center gap-1">
                      Status <SortIcon field="status" />
                    </span>
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                    onClick={() => handleSort('targetDate')}
                  >
                    <span className="flex items-center gap-1">
                      Data alvo <SortIcon field="targetDate" />
                    </span>
                  </th>
                  <th className="w-12 px-4 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((ws) => {
                  const wsTurmas = turmas.filter((t) => t.workshopId === ws.id);
                  const readyTurmas = wsTurmas.filter((t) => t.status === 'pronta').length;

                  return (
                    <tr
                      key={ws.id}
                      className={`transition-colors hover:bg-gray-50 ${selectedId === ws.id ? 'bg-brand-50/50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="radio"
                          name="workshop"
                          checked={selectedId === ws.id}
                          onChange={() => setSelectedId(ws.id === selectedId ? null : ws.id)}
                          className="rounded-full border-gray-300 text-brand-600 focus:ring-brand-500"
                          aria-label={`Selecionar ${ws.title}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/workshops/${ws.id}`)}
                          className="text-left group"
                        >
                          <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600">
                            {ws.title}
                          </p>
                          <p className="text-xs text-gray-500">{ws.clientArea}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {WORKSHOP_TYPE_LABELS[ws.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {readyTurmas}/{wsTurmas.length} sessões prontas
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(ws.status)}>
                          {WORKSHOP_STATUS_LABELS[ws.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(ws.targetDate).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDuplicateDialog(ws.id)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          aria-label={`Duplicar ${ws.title}`}
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Duplicate Dialog */}
      <Dialog
        open={showDuplicateDialog}
        onClose={() => setShowDuplicateDialog(false)}
        title="Duplicar Projeto"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDuplicateDialog(false)}>Cancelar</Button>
            <Button onClick={handleDuplicate} disabled={!duplicateName.trim()}>Duplicar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome do novo projeto"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            required
          />
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={dupIncludeTurmas}
                onChange={(e) => setDupIncludeTurmas(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Incluir sessões (como rascunho)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={dupIncludeMaterials}
                onChange={(e) => setDupIncludeMaterials(e.target.checked)}
                className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              Incluir materiais e atividades
            </label>
          </div>
        </div>
      </Dialog>
    </AppLayout>
  );
}

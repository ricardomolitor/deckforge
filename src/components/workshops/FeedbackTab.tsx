'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button, Card, Input, Textarea, EmptyState, MessageBar } from '@/components/ui';
import { MessageSquare, Plus, Star, ThumbsUp, ThumbsDown, Clock, RefreshCw } from 'lucide-react';
import type { CreateFeedbackDTO } from '@/lib/types';

interface FeedbackTabProps {
  workshopId: string;
}

export function FeedbackTab({ workshopId }: FeedbackTabProps) {
  const { getFeedbackByWorkshop, createFeedback, getWorkshopById } = useStore();
  const feedbacks = getFeedbackByWorkshop(workshopId);
  const workshop = getWorkshopById(workshopId);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateFeedbackDTO>({
    workshopId,
    adherencePercent: 80,
    whatWorked: '',
    whatToImprove: '',
    timeObservation: '',
    wouldReuse: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = () => {
    const errs: Record<string, string> = {};
    if (!form.whatWorked.trim() && !form.whatToImprove.trim()) {
      errs.whatWorked = 'Informe pelo menos um comentário.';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    createFeedback(form);
    setShowForm(false);
    setForm({
      workshopId,
      adherencePercent: 80,
      whatWorked: '',
      whatToImprove: '',
      timeObservation: '',
      wouldReuse: true,
    });
    setSuccessMsg('Feedback registrado com sucesso!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-4">
      {successMsg && <MessageBar type="success" onDismiss={() => setSuccessMsg('')}>{successMsg}</MessageBar>}

      {/* Existing feedbacks */}
      {feedbacks.length > 0 && (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <Card key={fb.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">Feedback Pós-Workshop</h4>
                <span className="text-xs text-gray-400">{new Date(fb.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold">
                    {fb.adherencePercent}%
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Aderência à agenda</p>
                    <div className="mt-1 h-1.5 w-24 rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${fb.adherencePercent}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <RefreshCw className={`h-5 w-5 ${fb.wouldReuse ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="text-xs text-gray-500">Reutilizaria esta agenda?</p>
                    <p className="text-sm font-medium">{fb.wouldReuse ? 'Sim' : 'Não'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {fb.whatWorked && (
                  <div>
                    <p className="flex items-center gap-1 text-xs font-medium text-green-700 mb-0.5">
                      <ThumbsUp className="h-3 w-3" /> O que funcionou bem
                    </p>
                    <p className="text-gray-700">{fb.whatWorked}</p>
                  </div>
                )}
                {fb.whatToImprove && (
                  <div>
                    <p className="flex items-center gap-1 text-xs font-medium text-yellow-700 mb-0.5">
                      <ThumbsDown className="h-3 w-3" /> O que poderia melhorar
                    </p>
                    <p className="text-gray-700">{fb.whatToImprove}</p>
                  </div>
                )}
                {fb.timeObservation && (
                  <div>
                    <p className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-0.5">
                      <Clock className="h-3 w-3" /> Observações sobre tempo
                    </p>
                    <p className="text-gray-700">{fb.timeObservation}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Feedback Form */}
      {showForm ? (
        <Card className="p-5 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">Registrar Feedback Pós-Workshop</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aderência à agenda (0–100%) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={form.adherencePercent}
                onChange={(e) => setForm({ ...form, adherencePercent: Number(e.target.value) })}
                className="flex-1 accent-brand-600"
              />
              <span className="text-lg font-bold text-brand-700 w-14 text-right">{form.adherencePercent}%</span>
            </div>
          </div>

          <Textarea
            label="O que funcionou bem?"
            value={form.whatWorked}
            onChange={(e) => setForm({ ...form, whatWorked: e.target.value })}
            error={errors.whatWorked}
            placeholder="Dinâmicas que engajaram, tempos bem calculados..."
          />

          <Textarea
            label="O que poderia melhorar?"
            value={form.whatToImprove}
            onChange={(e) => setForm({ ...form, whatToImprove: e.target.value })}
            placeholder="Atividades que ficaram curtas ou longas, materiais faltantes..."
          />

          <Textarea
            label="Observações sobre tempo"
            value={form.timeObservation}
            onChange={(e) => setForm({ ...form, timeObservation: e.target.value })}
            placeholder="Sobrou tempo? Faltou tempo? Quais atividades?"
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.wouldReuse}
              onChange={(e) => setForm({ ...form, wouldReuse: e.target.checked })}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Intenção de reutilizar esta agenda
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Registrar Feedback</Button>
          </div>
        </Card>
      ) : (
        feedbacks.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-12 w-12" />}
            title="Nenhum feedback registrado"
            description={
              workshop?.status === 'concluido'
                ? 'Registre como foi o workshop para ajudar a melhorar futuros templates.'
                : 'O registro de feedback estará disponível após a conclusão do workshop.'
            }
            action={
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> Registrar Feedback
              </Button>
            }
          />
        ) : (
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Adicionar outro feedback
            </Button>
          </div>
        )
      )}
    </div>
  );
}

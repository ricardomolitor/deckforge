import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  Workshop,
  WorkshopContext,
  AgendaBlock,
  Turma,
  Material,
  PostWorkshopFeedback,
  WorkshopTemplate,
  User,
  CreateWorkshopDTO,
  UpdateWorkshopDTO,
  CreateTurmaDTO,
  CreateMaterialDTO,
  CreateBlockDTO,
  CreateFeedbackDTO,
} from './types';
import {
  SEED_WORKSHOPS,
  SEED_TURMAS,
  SEED_BLOCKS,
  SEED_MATERIALS,
  SEED_CONTEXTS,
  SEED_TEMPLATES,
  SEED_USER,
} from './seed-data';

// ============================================
// Store global com Zustand — DeckForge
// ============================================

interface AppState {
  // Data
  currentUser: User | null;
  workshops: Workshop[];
  turmas: Turma[];
  blocks: AgendaBlock[];
  materials: Material[];
  contexts: WorkshopContext[];
  feedbacks: PostWorkshopFeedback[];
  templates: WorkshopTemplate[];

  // Auth
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  // Workshop CRUD
  createWorkshop: (dto: CreateWorkshopDTO) => Workshop;
  updateWorkshop: (id: string, dto: UpdateWorkshopDTO) => Workshop | null;
  deleteWorkshop: (id: string) => void;
  duplicateWorkshop: (id: string, newTitle: string, includeTurmas: boolean, includeMaterials: boolean) => Workshop;
  getWorkshopById: (id: string) => Workshop | undefined;

  // Workshop Context
  getContext: (workshopId: string) => WorkshopContext | undefined;
  saveContext: (workshopId: string, context: Partial<WorkshopContext>) => void;

  // Turma CRUD
  createTurma: (dto: CreateTurmaDTO) => Turma;
  updateTurma: (id: string, data: Partial<Turma>) => Turma | null;
  deleteTurma: (id: string) => void;
  duplicateTurma: (id: string) => Turma;
  getTurmasByWorkshop: (workshopId: string) => Turma[];

  // Block CRUD
  createBlock: (dto: CreateBlockDTO) => AgendaBlock;
  updateBlock: (id: string, data: Partial<AgendaBlock>) => AgendaBlock | null;
  deleteBlock: (id: string) => void;
  reorderBlocks: (workshopId: string, orderedIds: string[]) => void;
  getBlocksByWorkshop: (workshopId: string) => AgendaBlock[];

  // Material CRUD
  createMaterial: (dto: CreateMaterialDTO) => Material;
  updateMaterial: (id: string, data: Partial<Material>) => Material | null;
  deleteMaterial: (id: string) => void;
  getMaterialsByWorkshop: (workshopId: string) => Material[];

  // Feedback
  createFeedback: (dto: CreateFeedbackDTO) => PostWorkshopFeedback;
  getFeedbackByWorkshop: (workshopId: string) => PostWorkshopFeedback[];

  // Templates
  saveAsTemplate: (workshopId: string, name: string, description: string) => WorkshopTemplate;
  applyTemplate: (workshopId: string, templateId: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial data
  currentUser: SEED_USER,
  workshops: SEED_WORKSHOPS,
  turmas: SEED_TURMAS,
  blocks: SEED_BLOCKS,
  materials: SEED_MATERIALS,
  contexts: SEED_CONTEXTS,
  feedbacks: [],
  templates: SEED_TEMPLATES,
  isAuthenticated: true,

  // Auth
  login: (email: string, _password: string) => {
    if (email) {
      set({ isAuthenticated: true, currentUser: SEED_USER });
      return true;
    }
    return false;
  },

  logout: () => {
    set({ isAuthenticated: false, currentUser: null });
  },

  // Workshop CRUD
  createWorkshop: (dto: CreateWorkshopDTO) => {
    const ws: Workshop = {
      id: uuidv4(),
      title: dto.title,
      type: dto.type,
      clientArea: dto.clientArea,
      targetDate: dto.targetDate,
      estimatedDuration: dto.estimatedDuration,
      location: dto.location,
      status: 'em_preparacao',
      ownerId: get().currentUser?.id || 'user-001',
      coFacilitators: [],
      isTemplate: false,
      templateId: dto.templateId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ workshops: [...state.workshops, ws] }));

    // Apply template if selected
    if (dto.templateId) {
      get().applyTemplate(ws.id, dto.templateId);
    }

    return ws;
  },

  updateWorkshop: (id: string, dto: UpdateWorkshopDTO) => {
    let updated: Workshop | null = null;
    set((state) => ({
      workshops: state.workshops.map((ws) => {
        if (ws.id === id) {
          updated = { ...ws, ...dto, updatedAt: new Date().toISOString() };
          return updated;
        }
        return ws;
      }),
    }));
    return updated;
  },

  deleteWorkshop: (id: string) => {
    set((state) => ({
      workshops: state.workshops.filter((ws) => ws.id !== id),
      turmas: state.turmas.filter((t) => t.workshopId !== id),
      blocks: state.blocks.filter((b) => b.workshopId !== id),
      materials: state.materials.filter((m) => m.workshopId !== id),
      contexts: state.contexts.filter((c) => c.workshopId !== id),
    }));
  },

  duplicateWorkshop: (id: string, newTitle: string, includeTurmas: boolean, includeMaterials: boolean) => {
    const original = get().workshops.find((ws) => ws.id === id);
    if (!original) throw new Error('Workshop não encontrado');

    const newId = uuidv4();
    const ws: Workshop = {
      ...original,
      id: newId,
      title: newTitle,
      status: 'rascunho',
      isTemplate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Copy blocks
    const originalBlocks = get().blocks.filter((b) => b.workshopId === id);
    const newBlocks = originalBlocks.map((b) => ({
      ...b,
      id: uuidv4(),
      workshopId: newId,
    }));

    // Copy context
    const originalCtx = get().contexts.find((c) => c.workshopId === id);
    const newCtx = originalCtx
      ? { ...originalCtx, id: uuidv4(), workshopId: newId }
      : undefined;

    let newTurmas: Turma[] = [];
    let newMaterials: Material[] = [];

    if (includeTurmas) {
      const origTurmas = get().turmas.filter((t) => t.workshopId === id);
      newTurmas = origTurmas.map((t) => ({
        ...t,
        id: uuidv4(),
        workshopId: newId,
        status: 'rascunho' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    if (includeMaterials) {
      const origMats = get().materials.filter((m) => m.workshopId === id);
      newMaterials = origMats.map((m) => ({
        ...m,
        id: uuidv4(),
        workshopId: newId,
        createdAt: new Date().toISOString(),
      }));
    }

    set((state) => ({
      workshops: [...state.workshops, ws],
      blocks: [...state.blocks, ...newBlocks],
      turmas: [...state.turmas, ...newTurmas],
      materials: [...state.materials, ...newMaterials],
      contexts: newCtx ? [...state.contexts, newCtx] : state.contexts,
    }));

    return ws;
  },

  getWorkshopById: (id: string) => {
    return get().workshops.find((ws) => ws.id === id);
  },

  // Context
  getContext: (workshopId: string) => {
    return get().contexts.find((c) => c.workshopId === workshopId);
  },

  saveContext: (workshopId: string, context: Partial<WorkshopContext>) => {
    const existing = get().contexts.find((c) => c.workshopId === workshopId);
    if (existing) {
      set((state) => ({
        contexts: state.contexts.map((c) =>
          c.workshopId === workshopId ? { ...c, ...context } : c
        ),
      }));
    } else {
      const newCtx: WorkshopContext = {
        id: uuidv4(),
        workshopId,
        businessProblem: '',
        mainObjective: '',
        expectedOutputs: [],
        participantProfiles: [],
        maturityLevel: 'medio',
        additionalNotes: '',
        ...context,
      };
      set((state) => ({ contexts: [...state.contexts, newCtx] }));
    }
  },

  // Turma CRUD
  createTurma: (dto: CreateTurmaDTO) => {
    const turma: Turma = {
      id: uuidv4(),
      workshopId: dto.workshopId,
      name: dto.name,
      date: dto.date,
      time: dto.time,
      duration: dto.duration,
      locationType: dto.locationType,
      locationValue: dto.locationValue,
      facilitatorId: dto.facilitatorId || get().currentUser?.id || 'user-001',
      status: 'rascunho',
      customAgenda: false,
      materialIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ turmas: [...state.turmas, turma] }));
    return turma;
  },

  updateTurma: (id: string, data: Partial<Turma>) => {
    let updated: Turma | null = null;
    set((state) => ({
      turmas: state.turmas.map((t) => {
        if (t.id === id) {
          updated = { ...t, ...data, updatedAt: new Date().toISOString() };
          return updated;
        }
        return t;
      }),
    }));
    return updated;
  },

  deleteTurma: (id: string) => {
    set((state) => ({ turmas: state.turmas.filter((t) => t.id !== id) }));
  },

  duplicateTurma: (id: string) => {
    const original = get().turmas.find((t) => t.id === id);
    if (!original) throw new Error('Turma não encontrada');
    const newTurma: Turma = {
      ...original,
      id: uuidv4(),
      name: `Cópia de ${original.name}`,
      status: 'rascunho',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({ turmas: [...state.turmas, newTurma] }));
    return newTurma;
  },

  getTurmasByWorkshop: (workshopId: string) => {
    return get().turmas.filter((t) => t.workshopId === workshopId);
  },

  // Block CRUD
  createBlock: (dto: CreateBlockDTO) => {
    const block: AgendaBlock = {
      id: uuidv4(),
      ...dto,
    };
    set((state) => ({ blocks: [...state.blocks, block] }));
    return block;
  },

  updateBlock: (id: string, data: Partial<AgendaBlock>) => {
    let updated: AgendaBlock | null = null;
    set((state) => ({
      blocks: state.blocks.map((b) => {
        if (b.id === id) {
          updated = { ...b, ...data };
          return updated;
        }
        return b;
      }),
    }));
    return updated;
  },

  deleteBlock: (id: string) => {
    set((state) => ({ blocks: state.blocks.filter((b) => b.id !== id) }));
  },

  reorderBlocks: (workshopId: string, orderedIds: string[]) => {
    set((state) => ({
      blocks: state.blocks.map((b) => {
        if (b.workshopId === workshopId) {
          const newOrder = orderedIds.indexOf(b.id);
          return newOrder >= 0 ? { ...b, order: newOrder } : b;
        }
        return b;
      }),
    }));
  },

  getBlocksByWorkshop: (workshopId: string) => {
    return get()
      .blocks.filter((b) => b.workshopId === workshopId)
      .sort((a, b) => a.order - b.order);
  },

  // Material CRUD
  createMaterial: (dto: CreateMaterialDTO) => {
    const mat: Material = {
      id: uuidv4(),
      workshopId: dto.workshopId,
      name: dto.name,
      type: dto.type,
      phase: dto.phase,
      url: dto.url,
      fileName: dto.fileName,
      applyToAll: dto.applyToAll,
      turmaIds: dto.turmaIds,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ materials: [...state.materials, mat] }));
    return mat;
  },

  updateMaterial: (id: string, data: Partial<Material>) => {
    let updated: Material | null = null;
    set((state) => ({
      materials: state.materials.map((m) => {
        if (m.id === id) {
          updated = { ...m, ...data };
          return updated;
        }
        return m;
      }),
    }));
    return updated;
  },

  deleteMaterial: (id: string) => {
    set((state) => ({ materials: state.materials.filter((m) => m.id !== id) }));
  },

  getMaterialsByWorkshop: (workshopId: string) => {
    return get().materials.filter((m) => m.workshopId === workshopId);
  },

  // Feedback
  createFeedback: (dto: CreateFeedbackDTO) => {
    const fb: PostWorkshopFeedback = {
      id: uuidv4(),
      ...dto,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ feedbacks: [...state.feedbacks, fb] }));
    return fb;
  },

  getFeedbackByWorkshop: (workshopId: string) => {
    return get().feedbacks.filter((f) => f.workshopId === workshopId);
  },

  // Templates
  saveAsTemplate: (workshopId: string, name: string, description: string) => {
    const ws = get().workshops.find((w) => w.id === workshopId);
    const wsBlocks = get().getBlocksByWorkshop(workshopId);
    const wsMats = get().getMaterialsByWorkshop(workshopId);

    if (!ws) throw new Error('Workshop não encontrado');

    const tpl: WorkshopTemplate = {
      id: uuidv4(),
      name,
      description,
      workshopType: ws.type,
      estimatedDuration: ws.estimatedDuration,
      blocks: wsBlocks.map(({ id, workshopId: wid, ...rest }) => rest),
      materials: wsMats.map(({ id, workshopId: wid, createdAt, ...rest }) => rest),
      createdBy: get().currentUser?.id || 'user-001',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({ templates: [...state.templates, tpl] }));
    return tpl;
  },

  applyTemplate: (workshopId: string, templateId: string) => {
    const tpl = get().templates.find((t) => t.id === templateId);
    if (!tpl) return;

    const newBlocks: AgendaBlock[] = tpl.blocks.map((b, i) => ({
      ...b,
      id: uuidv4(),
      workshopId,
    }));

    const newMats: Material[] = tpl.materials.map((m) => ({
      ...m,
      id: uuidv4(),
      workshopId,
      createdAt: new Date().toISOString(),
    }));

    set((state) => ({
      blocks: [...state.blocks, ...newBlocks],
      materials: [...state.materials, ...newMats],
    }));
  },
}));

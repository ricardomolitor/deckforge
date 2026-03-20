import { create } from 'zustand';
import {
  type ForgeProject,
  type AgentId,
  type AgentRunState,
  type SlideContent,
  AGENT_PIPELINE,
  createEmptyProject,
} from './agents';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Forge Store — Motor de Geração com Agentes
// ============================================

interface ForgeState {
  // Projects
  projects: ForgeProject[];
  currentProjectId: string | null;

  // Actions
  createProject: (data: Pick<ForgeProject, 'title' | 'category' | 'briefing' | 'audience' | 'tone' | 'duration'>) => ForgeProject;
  getCurrentProject: () => ForgeProject | null;
  deleteProject: (id: string) => void;

  // Agent Pipeline
  startPipeline: (projectId: string) => void;
  updateAgentStatus: (projectId: string, agentId: AgentId, status: AgentRunState['status'], output?: string) => void;
  setAgentStarted: (projectId: string, agentId: AgentId) => void;
  setAgentDone: (projectId: string, agentId: AgentId, output: string, tokensUsed?: number) => void;
  setAgentError: (projectId: string, agentId: AgentId, error: string) => void;
  setProjectStatus: (projectId: string, status: ForgeProject['status']) => void;

  // Results
  setSlides: (projectId: string, slides: SlideContent[]) => void;
  setNarrative: (projectId: string, narrative: string) => void;
  setKeyMessages: (projectId: string, messages: string[]) => void;
  setResearchInsights: (projectId: string, insights: string[]) => void;
  setReviewFeedback: (projectId: string, feedback: string) => void;
}

export const useForgeStore = create<ForgeState>((set, get) => ({
  projects: [],
  currentProjectId: null,

  createProject: (data) => {
    const project = createEmptyProject({
      ...data,
      status: 'briefing',
    });
    set((s) => ({
      projects: [project, ...s.projects],
      currentProjectId: project.id,
    }));
    return project;
  },

  getCurrentProject: () => {
    const { projects, currentProjectId } = get();
    return projects.find((p) => p.id === currentProjectId) || null;
  },

  deleteProject: (id) => {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
    }));
  },

  startPipeline: (projectId) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              status: 'running' as const,
              agents: p.agents.map((a) => ({ ...a, status: 'idle' as const, output: '' })),
            }
          : p
      ),
    }));
  },

  updateAgentStatus: (projectId, agentId, status, output) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              agents: p.agents.map((a) =>
                a.agentId === agentId ? { ...a, status, output: output ?? a.output } : a
              ),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
  },

  setAgentStarted: (projectId, agentId) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              agents: p.agents.map((a) =>
                a.agentId === agentId ? { ...a, status: 'running' as const, startedAt: Date.now() } : a
              ),
            }
          : p
      ),
    }));
  },

  setAgentDone: (projectId, agentId, output, tokensUsed) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              agents: p.agents.map((a) =>
                a.agentId === agentId
                  ? { ...a, status: 'done' as const, output, finishedAt: Date.now(), tokensUsed }
                  : a
              ),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    }));
  },

  setAgentError: (projectId, agentId, error) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              status: 'error' as const,
              agents: p.agents.map((a) =>
                a.agentId === agentId ? { ...a, status: 'error' as const, output: error, finishedAt: Date.now() } : a
              ),
            }
          : p
      ),
    }));
  },

  setProjectStatus: (projectId, status) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, status, updatedAt: new Date().toISOString() } : p
      ),
    }));
  },

  setSlides: (projectId, slides) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, slides } : p
      ),
    }));
  },

  setNarrative: (projectId, narrative) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, narrative } : p
      ),
    }));
  },

  setKeyMessages: (projectId, messages) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, keyMessages: messages } : p
      ),
    }));
  },

  setResearchInsights: (projectId, insights) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, researchInsights: insights } : p
      ),
    }));
  },

  setReviewFeedback: (projectId, feedback) => {
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, reviewFeedback: feedback } : p
      ),
    }));
  },
}));

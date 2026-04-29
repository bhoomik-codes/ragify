import { create } from 'zustand';
import { Artifact, ArtifactVersion } from '../../types/blocks';

interface ArtifactState {
  artifacts: Artifact[];
  activeId: string | null;
  sidebarOpen: boolean;
  addArtifact: (artifact: Omit<Artifact, 'id' | 'createdAt' | 'versions'>) => string;
  updateArtifact: (id: string, content: string) => void;
  setActive: (id: string | null) => void;
  toggleSidebar: (open?: boolean) => void;
  clearArtifacts: () => void;
}

export const useArtifactStore = create<ArtifactState>((set) => ({
  artifacts: [],
  activeId: null,
  sidebarOpen: false,

  addArtifact: (data) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newArtifact: Artifact = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      versions: [{ id: 'v1', content: data.content, timestamp: new Date().toISOString() }],
    };
    set((state) => ({
      artifacts: [...state.artifacts, newArtifact],
      activeId: id,
      sidebarOpen: true,
    }));
    return id;
  },

  updateArtifact: (id, content) => {
    set((state) => ({
      artifacts: state.artifacts.map((a) => {
        if (a.id === id) {
          // If content is the same as last version, don't add new version
          if (a.content === content) return a;
          
          const newVersion: ArtifactVersion = {
            id: `v${a.versions.length + 1}`,
            content,
            timestamp: new Date().toISOString(),
          };
          return { ...a, content, versions: [...a.versions, newVersion] };
        }
        return a;
      }),
    }));
  },

  setActive: (id) => set((state) => ({ 
    activeId: id, 
    sidebarOpen: id ? true : state.sidebarOpen 
  })),

  toggleSidebar: (open) => set((state) => ({ 
    sidebarOpen: open !== undefined ? open : !state.sidebarOpen 
  })),

  clearArtifacts: () => set({ artifacts: [], activeId: null, sidebarOpen: false }),
}));

import { create } from 'zustand';
import { Provider, type WizardFormDataInput } from '../../../../lib/types';

interface WizardState {
  step: number;
  data: WizardFormDataInput;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateData: (partial: Partial<WizardFormDataInput>) => void;
  reset: () => void;
}

const defaultData: WizardFormDataInput = {
  name: '',
  description: '',
  emoji: '🤖',
  tags: [],
  provider: Provider.OPENAI,
  model: 'gpt-4-turbo',
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1.0,
  systemPrompt: 'You are a helpful assistant.',
  strictMode: false,
  chunkSize: 1000,
  chunkOverlap: 200,
  topK: 5,
  threshold: 0.5,
  enableReranking: false,
  embeddingModel: 'text-embedding-3-small',
  maxTurns: 20,
  rateLimit: 100,
  filterLevel: 'MEDIUM',
  citationMode: 'INLINE',
  documentIds: [],
};

export const useWizardStore = create<WizardState>((set) => ({
  step: 1,
  data: defaultData,
  setStep: (step) => set({ step }),
  nextStep: () => set((state) => ({ step: Math.min(state.step + 1, 6) })),
  prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),
  updateData: (partial) => set((state) => ({ data: { ...state.data, ...partial } })),
  reset: () => set({ step: 1, data: defaultData }),
}));

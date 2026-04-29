import { create } from 'zustand';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  conversationId: string | null;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'createdAt'>) => string;
  updateLastAssistantMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setConversationId: (id: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  conversationId: null,

  addMessage: (msg) => {
    const id = crypto.randomUUID();
    const message: ChatMessage = {
      ...msg,
      id,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, message] }));
    return id;
  },

  updateLastAssistantMessage: (content) => {
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          messages[i] = { ...messages[i], content };
          break;
        }
      }
      return { messages };
    });
  },

  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setConversationId: (id) => set({ conversationId: id }),
  clearMessages: () => set({ messages: [], conversationId: null }),
}));

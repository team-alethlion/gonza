import { create } from 'zustand';

interface NavigationState {
  history: string[];
  addToHistory: (path: string) => void;
  canGoBack: () => boolean;
  getPreviousRoute: () => string | null;
  clearHistory: () => void;
  goBack: (router: any) => void;
}

/**
 * 🗺️ NAVIGATION STORE
 * 
 * Manages URL visit history globally.
 * Allows components to trigger "Go Back" functionality without 
 * knowing the specific previous URL.
 */
export const useNavigationStore = create<NavigationState>((set, get) => ({
  history: [],

  addToHistory: (path: string) => {
    const { history } = get();
    // Don't add if it's the same as the current path
    if (history[history.length - 1] === path) return;

    set((state) => ({
      history: [...state.history, path].slice(-20), // Keep last 20 paths
    }));
  },

  canGoBack: () => get().history.length > 1,

  getPreviousRoute: () => {
    const { history } = get();
    if (history.length < 2) return null;
    return history[history.length - 2];
  },

  clearHistory: () => set({ history: [] }),

  goBack: (router: any) => {
    const { history } = get();
    if (history.length < 2) {
      // Fallback if no history exists
      router.push('/agency');
      return;
    }

    const previousPath = history[history.length - 2];
    
    // Remove the current path from history
    set((state) => ({
      history: state.history.slice(0, -1),
    }));

    router.push(previousPath);
  },
}));

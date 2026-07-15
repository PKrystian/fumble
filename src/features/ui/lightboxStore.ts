import { create } from 'zustand';

interface LightboxState {
  src: string | null;
  caption: string;
  open: (src: string, caption?: string) => void;
  close: () => void;
}

export const useLightbox = create<LightboxState>((set) => ({
  src: null,
  caption: '',
  open: (src, caption = '') => set({ src, caption }),
  close: () => set({ src: null, caption: '' }),
}));

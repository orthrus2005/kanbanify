import { create } from 'zustand';

// Simple promise-based confirm dialog state.
// Usage:
// const requestConfirm = useConfirmStore((s) => s.requestConfirm);
// const ok = await requestConfirm({ title: 'Удалить', message: '...' });
export const useConfirmStore = create((set, get) => ({
  isOpen: false,
  title: 'Подтверждение',
  message: '',
  _resolve: null,

  requestConfirm: ({ title = 'Подтверждение', message = '' } = {}) => {
    return new Promise((resolve) => {
      set({ isOpen: true, title, message, _resolve: resolve });
    });
  },

  confirmYes: () => {
    const resolve = get()._resolve;
    if (resolve) resolve(true);
    set({ isOpen: false, title: 'Подтверждение', message: '', _resolve: null });
  },

  confirmNo: () => {
    const resolve = get()._resolve;
    if (resolve) resolve(false);
    set({ isOpen: false, title: 'Подтверждение', message: '', _resolve: null });
  },
}));


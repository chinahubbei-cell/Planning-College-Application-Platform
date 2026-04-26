import { create } from 'zustand';

const useUIStore = create((set) => ({
    // Theme
    theme: 'light',
    toggleTheme: () => set((state) => ({
        theme: state.theme === 'dark' ? 'light' : 'dark',
    })),

    // Mobile menu
    mobileMenuOpen: false,
    setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

    // Toast notifications
    toasts: [],
    addToast: (toast) => set((state) => ({
        toasts: [...state.toasts, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...toast }],
    })),
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export default useUIStore;

import { create } from 'zustand';

const useAuthStore = create((set) => ({
    user: null,
    session: null,
    loading: true,
    error: null,

    setUser: (user) => set({ user, loading: false }),
    setSession: (session) => set({ session }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    logout: () => set({
        user: null,
        session: null,
        loading: false,
        error: null,
    }),
}));

export default useAuthStore;

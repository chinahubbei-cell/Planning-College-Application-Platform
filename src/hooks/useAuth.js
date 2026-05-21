import { useEffect } from 'react';
import useAuthStore from '../stores/useAuthStore';
import { onAuthStateChange, getUserProfile, signOut as authSignOut } from '../services/authService';
import { hasSupabaseConfig } from '../services/supabaseConfig';

/**
 * useAuth hook — 初始化并监听认证状态
 */
export default function useAuth() {
    const { user, session, loading, setUser, setSession, logout } = useAuthStore();

    useEffect(() => {
        if (!hasSupabaseConfig()) {
            setSession(null);
            setUser(null);
            return undefined;
        }

        // 监听认证状态变化
        const { data: { subscription } } = onAuthStateChange((event, session) => {
            setSession(session);
            if (session?.user) {
                // Do not await supabase calls directly inside onAuthStateChange callback
                // to avoid deadlocking the Supabase client's auth mutex.
                getUserProfile(session.user.id)
                    .then(profile => {
                        setUser({ ...session.user, profile });
                    })
                    .catch(err => {
                        console.error('Failed to fetch user profile:', err);
                        setUser(session.user);
                    });
            } else {
                setUser(null);
            }
        });

        return () => subscription?.unsubscribe();
    }, [setSession, setUser]);

    const handleSignOut = async () => {
        try {
            await authSignOut();
            logout();
        } catch (error) {
            console.error('Sign out error:', error);
            logout();
        }
    };

    return {
        user,
        session,
        loading,
        isAuthenticated: !!user,
        signOut: handleSignOut,
    };
}

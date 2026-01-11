// supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

const AUTH_KEY = 'Blue Block_user_session';

const currentPath = window.location.pathname;
const isPublicPage =
    currentPath.includes('login/index.html') ||
    currentPath.includes('register/index.html') ||
    currentPath.includes('forgotpassword.html') ||
    currentPath.includes('404.html') ||
    currentPath.endsWith('login/') ||
    currentPath.endsWith('register/');

export const AuthService = {
    setSession(uuid) {
        localStorage.setItem(AUTH_KEY, uuid);
    },

    getSession() {
        return localStorage.getItem(AUTH_KEY);
    },

    removeSession() {
        localStorage.removeItem(AUTH_KEY);
        localStorage.clear();
        sessionStorage.clear();
        window.dispatchEvent(new Event('storage'));
    },

    /**
     * ROUTE GUARD
     * Checks Visibility and Session.
     */
    async requireAuth() {
        try {
            // 1. Check Website Visibility first
            const { data: admin } = await supabase
                .from('admin')
                .select('website_visibility')
                .eq('id', 1)
                .single();

            // If visibility is false, trigger logout logic
            if (admin && admin.website_visibility === false) {
                this.removeSession();
                // We do NOT redirect here to avoid path errors
                return null;
            }

            // 2. Check Local Auth Session
            const uuid = this.getSession();
            if (!uuid && !isPublicPage) {
                window.location.href = '../login/index.html';
                return null;
            }
            return uuid;
        } catch (e) {
            // Fallback for network errors: allow session check to proceed
            return this.getSession();
        }
    },

    async fetchProfile(uuid) {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('uuid', uuid)
            .single();

        if (error || !data) {
            this.removeSession();
            if (!isPublicPage) window.location.href = '../login/index.html';
            throw new Error("Invalid Session");
        }
        return data;
    }
};

window.addEventListener('storage', (event) => {
    if (!localStorage.getItem(AUTH_KEY) && !isPublicPage) {
        window.location.href = '../login/index.html';
    }
});

export const handleGlobalLogout = async (onComplete) => {
    AuthService.removeSession();
    if (onComplete) onComplete();
    else if (!isPublicPage) window.location.href = '../login/index.html';
};

/** * IMPORTANT: We removed the Auto-Run from the bottom 
 * because it blocks the dashboard data fetching.
 */
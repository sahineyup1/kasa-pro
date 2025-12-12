import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  uid: string;
  username: string;
  fullName: string;
  role: string;
  branchId?: string;
  branchName?: string;
  permissions?: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionExpiry: number | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  checkSession: () => boolean;
}

// Session suresi: 8 saat (milisaniye)
const SESSION_DURATION = 8 * 60 * 60 * 1000;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      sessionExpiry: null,

      setUser: (user) => {
        if (user) {
          const expiry = Date.now() + SESSION_DURATION;
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            sessionExpiry: expiry
          });
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            sessionExpiry: null
          });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          sessionExpiry: null
        });
        // LocalStorage'i temizle
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
      },

      checkSession: () => {
        const state = get();
        if (!state.sessionExpiry || !state.isAuthenticated) {
          return false;
        }

        // Session suresi dolmus mu?
        if (Date.now() > state.sessionExpiry) {
          // Session expired, logout
          set({
            user: null,
            isAuthenticated: false,
            sessionExpiry: null
          });
          return false;
        }

        return true;
      },
    }),
    {
      name: 'auth-storage',
      // Storage erişim hataları için güvenli storage
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return {
          getItem: (name) => {
            try {
              return localStorage.getItem(name);
            } catch {
              return null;
            }
          },
          setItem: (name, value) => {
            try {
              localStorage.setItem(name, value);
            } catch {
              // Storage erişim hatası - sessizce devam et
            }
          },
          removeItem: (name) => {
            try {
              localStorage.removeItem(name);
            } catch {
              // Storage erişim hatası - sessizce devam et
            }
          },
        };
      }),
      // Sadece guvenli alanlari persist et
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionExpiry: state.sessionExpiry,
      }),
      // Hydrate oldugunda session kontrolu yap
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Session expired mi kontrol et
          if (state.sessionExpiry && Date.now() > state.sessionExpiry) {
            state.user = null;
            state.isAuthenticated = false;
            state.sessionExpiry = null;
          }
          state.isLoading = false;
        }
      },
    }
  )
);

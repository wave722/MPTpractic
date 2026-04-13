import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, StudentAccess } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  studentAccess: StudentAccess | null;
  setAuth: (user: User, token: string, studentAccess?: StudentAccess | null) => void;
  setStudentAccess: (studentAccess: StudentAccess | null) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isMethodist: () => boolean;
  isStudent: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      studentAccess: null,
      setAuth: (user, token, studentAccess = null) => {
        localStorage.setItem('token', token);
        set({
          user,
          token,
          studentAccess: user.role === 'STUDENT' ? studentAccess ?? null : null,
        });
      },
      setStudentAccess: (studentAccess) => set({ studentAccess }),
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, studentAccess: null });
      },
      isAdmin: () => get().user?.role === 'ADMIN',
      /** Кнопки редактирования в справочниках: администратор или методист (не наблюдатель и не студент). */
      isMethodist: () => {
        const r = get().user?.role;
        return r === 'ADMIN' || r === 'METHODIST';
      },
      isStudent: () => get().user?.role === 'STUDENT',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        studentAccess: state.studentAccess,
      }),
    }
  )
);

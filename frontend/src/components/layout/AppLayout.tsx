import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api';
import type { Role } from '@/types';

export function AppLayout() {
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    authApi
      .me()
      .then((res) => {
        const d = res.data;
        useAuthStore.setState({
          user: { id: d.id, email: d.email, name: d.name, role: d.role as Role },
          studentAccess: d.studentAccess ?? null,
        });
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden || !useAuthStore.getState().token) return;
      authApi
        .me()
        .then((res) => {
          const d = res.data;
          useAuthStore.setState({
            user: { id: d.id, email: d.email, name: d.name, role: d.role as Role },
            studentAccess: d.studentAccess ?? null,
          });
        })
        .catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

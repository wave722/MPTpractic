import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

/** Студент не попадает в админ-разделы; после подтверждения анкеты — на «Мои назначения». */
export function StudentStaffGate() {
  const { user, studentAccess } = useAuthStore();
  if (user?.role === 'STUDENT') {
    return (
      <Navigate
        to={studentAccess?.canAccessAssignments ? '/my-assignments' : '/student/onboarding'}
        replace
      />
    );
  }
  return <Outlet />;
}

export function MyAssignmentsAccess({ children }: { children: JSX.Element }) {
  const { user, studentAccess } = useAuthStore();
  if (user?.role === 'STUDENT' && !studentAccess?.canAccessAssignments) {
    return <Navigate to="/student/onboarding" replace />;
  }
  return children;
}

export function RequireModerator({ children }: { children: JSX.Element }) {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'METHODIST' && role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function RequireStudent({ children }: { children: JSX.Element }) {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'STUDENT') {
    return <Navigate to="/" replace />;
  }
  return children;
}

import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ModulesPage } from '@/pages/ModulesPage';
import { PracticesPage } from '@/pages/PracticesPage';
import { OrganizationsPage } from '@/pages/OrganizationsPage';
import { GroupsPage } from '@/pages/GroupsPage';
import { StudentsPage } from '@/pages/StudentsPage';
import { TechSupervisorsPage } from '@/pages/TechSupervisorsPage';
import { SearchPage } from '@/pages/SearchPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { GroupIndexLabelsPage } from '@/pages/GroupIndexLabelsPage';
import { QualificationPracticeOffersPage } from '@/pages/QualificationPracticeOffersPage';
import { MyAssignmentsPage } from '@/pages/MyAssignmentsPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { StudentOnboardingPage } from '@/pages/StudentOnboardingPage';
import { StudentReviewsPage } from '@/pages/StudentReviewsPage';
import {
  StudentStaffGate,
  MyAssignmentsAccess,
  RequireModerator,
  RequireStudent,
} from '@/components/routing/AccessGates';
import { useAuthStore } from '@/store/auth';

function HomeRoute() {
  const { user, studentAccess } = useAuthStore();
  if (user?.role === 'STUDENT') {
    if (studentAccess?.canAccessAssignments) return <Navigate to="/my-assignments" replace />;
    return <Navigate to="/student/onboarding" replace />;
  }
  if (user?.role === 'METHODIST') return <Navigate to="/my-assignments" replace />;
  return <DashboardPage />;
}

function RequireNotMethodist({ children }: { children: JSX.Element }) {
  const { user } = useAuthStore();
  if (user?.role === 'METHODIST') return <Navigate to="/my-assignments" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRoute />} />
        <Route
          path="/student/onboarding"
          element={
            <RequireStudent>
              <StudentOnboardingPage />
            </RequireStudent>
          }
        />
        <Route
          path="/my-assignments"
          element={
            <MyAssignmentsAccess>
              <MyAssignmentsPage />
            </MyAssignmentsAccess>
          }
        />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/student-reviews"
          element={
            <RequireModerator>
              <StudentReviewsPage />
            </RequireModerator>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireModerator>
              <ReportsPage />
            </RequireModerator>
          }
        />
        <Route
          path="/group-index-labels"
          element={
            <RequireModerator>
              <GroupIndexLabelsPage />
            </RequireModerator>
          }
        />
        <Route
          path="/qualification-practice-offers"
          element={
            <RequireModerator>
              <QualificationPracticeOffersPage />
            </RequireModerator>
          }
        />

        <Route element={<StudentStaffGate />}>
          <Route path="/modules" element={<RequireNotMethodist><ModulesPage /></RequireNotMethodist>} />
          <Route path="/practices" element={<RequireNotMethodist><PracticesPage /></RequireNotMethodist>} />
          <Route path="/organizations" element={<RequireNotMethodist><OrganizationsPage /></RequireNotMethodist>} />
          <Route path="/groups" element={<RequireNotMethodist><GroupsPage /></RequireNotMethodist>} />
          <Route path="/students" element={<RequireNotMethodist><StudentsPage /></RequireNotMethodist>} />
          <Route path="/supervisors" element={<RequireNotMethodist><TechSupervisorsPage /></RequireNotMethodist>} />
          <Route path="/search" element={<RequireNotMethodist><SearchPage /></RequireNotMethodist>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

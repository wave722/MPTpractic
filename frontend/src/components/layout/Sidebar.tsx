import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, BookOpen, BookMarked,
  Users, GraduationCap, UserCheck, Search,
  FileDown, LogOut, ChevronRight, ClipboardList, User, Tag, CalendarRange,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export function Sidebar() {
  const { user, logout, studentAccess } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel: Record<string, string> = {
    ADMIN: 'Администратор',
    METHODIST: 'Методист',
    OBSERVER: 'Наблюдатель',
    STUDENT: 'Студент',
  };

  const navItems =
    user?.role === 'STUDENT'
      ? [
          ...(studentAccess?.canAccessAssignments
            ? [{ to: '/my-assignments', label: 'Мои назначения', icon: ClipboardList }]
            : []),
          { to: '/student/onboarding', label: 'Анкета и статус', icon: GraduationCap },
          { to: '/profile', label: 'Мой профиль', icon: User },
        ]
      : user?.role === 'METHODIST'
        ? [
            { to: '/my-assignments', label: 'Мои задания', icon: ClipboardList },
            { to: '/student-reviews', label: 'Проверка анкет', icon: UserCheck },
            { to: '/reports', label: 'Отчёты', icon: FileDown },
            { to: '/group-index-labels', label: 'Коды индексов', icon: Tag },
            { to: '/qualification-practice-offers', label: 'Практики по направлениям', icon: CalendarRange },
            { to: '/profile', label: 'Мой профиль', icon: User },
          ]
        : [
            { to: '/', label: 'Дашборд', icon: LayoutDashboard },
            { to: '/modules', label: 'Модули', icon: BookMarked },
            { to: '/practices', label: 'Практики', icon: BookOpen },
            { to: '/organizations', label: 'Организации', icon: Building2 },
            { to: '/groups', label: 'Группы', icon: Users },
            { to: '/students', label: 'Студенты', icon: GraduationCap },
            { to: '/supervisors', label: 'Руководители ПП', icon: UserCheck },
            { to: '/search', label: 'Поиск студента', icon: Search },
            ...(user?.role === 'ADMIN'
              ? [
                  { to: '/reports', label: 'Отчёты', icon: FileDown },
                  { to: '/group-index-labels', label: 'Коды индексов', icon: Tag },
                  { to: '/qualification-practice-offers', label: 'Практики по направлениям', icon: CalendarRange },
                  { to: '/student-reviews', label: 'Проверка анкет', icon: UserCheck },
                ]
              : []),
          ];

  return (
    <aside className="w-64 bg-primary-950 text-white flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-primary-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-400 rounded-lg flex items-center justify-center shrink-0">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-white">МПТ — Практика</div>
            <div className="text-xs text-primary-400 leading-tight">Управление ПП</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <div className="text-xs font-semibold text-primary-500 uppercase tracking-wider px-2 mb-2">
          Навигация
        </div>
        <ul className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                  ${isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} className={isActive ? 'text-white' : 'text-primary-400 group-hover:text-white'} />
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight size={14} className="text-primary-400" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-primary-800">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
            {user?.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name}</div>
            <div className="text-xs text-primary-400">
              {user?.role ? roleLabel[user.role] : ''}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary-300 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
    </aside>
  );
}

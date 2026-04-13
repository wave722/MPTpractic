import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { authApi } from '@/api';
import toast from 'react-hot-toast';
import type { Role } from '@/types';

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  name: string;
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const loginForm = useForm<LoginForm>();
  const registerForm = useForm<RegisterForm>();

  const onLogin = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await authApi.login(data.email, data.password);
      const { token, user, studentAccess } = res.data;
      setAuth(
        { id: user.id, email: user.email, name: user.name, role: user.role as Role },
        token,
        studentAccess ?? null
      );
      navigate('/');
    } catch {
      toast.error('Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const res = await authApi.registerStudent({
        name: data.name.trim(),
        email: data.email.trim(),
        password: data.password,
      });
      const { token, user, studentAccess } = res.data;
      setAuth(
        { id: user.id, email: user.email, name: user.name, role: user.role as Role },
        token,
        studentAccess ?? null
      );
      toast.success('Регистрация успешна. Заполните анкету.');
      navigate('/student/onboarding');
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string; errors?: { msg: string }[] } } };
      const msg =
        ax.response?.data?.error ??
        ax.response?.data?.errors?.[0]?.msg ??
        'Не удалось зарегистрироваться';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">МПТ — Практика</h1>
          <p className="text-primary-300 text-sm mt-1">Система учёта практической подготовки</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'register' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Регистрация студента
            </button>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Вход в систему</h2>
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      {...loginForm.register('email', {
                        required: 'Email обязателен',
                        pattern: { value: /\S+@\S+\.\S+/, message: 'Некорректный email' },
                      })}
                      type="email"
                      placeholder="admin@mpt.ru"
                      className={`input pl-9 ${loginForm.formState.errors.email ? 'input-error' : ''}`}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-red-600 mt-1">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Пароль</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      {...loginForm.register('password', { required: 'Пароль обязателен' })}
                      type={showPwd ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`input pl-9 pr-10 ${loginForm.formState.errors.password ? 'input-error' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-red-600 mt-1">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-6">
                  {loading ? 'Вход...' : 'Войти'}
                </button>
              </form>

              <div className="mt-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-0.5">
                <p className="font-medium text-gray-600 mb-1">Тестовые аккаунты:</p>
                <p>Администратор: admin@mpt.ru / admin123</p>
                <p>Методист: methodist@mpt.ru / methodist123</p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Регистрация студента</h2>
              <p className="text-sm text-gray-500 mb-6">
                Допускается только корпоративная почта <strong>@mpt.ru</strong>
              </p>
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div>
                  <label className="label">Как к вам обращаться</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      {...registerForm.register('name', { required: 'Укажите имя' })}
                      type="text"
                      placeholder="Иван Иванов"
                      className={`input pl-9 ${registerForm.formState.errors.name ? 'input-error' : ''}`}
                    />
                  </div>
                  {registerForm.formState.errors.name && (
                    <p className="text-xs text-red-600 mt-1">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Email @mpt.ru</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      {...registerForm.register('email', {
                        required: 'Email обязателен',
                        pattern: { value: /\S+@\S+\.\S+/, message: 'Некорректный email' },
                      })}
                      type="email"
                      placeholder="student@mpt.ru"
                      className={`input pl-9 ${registerForm.formState.errors.email ? 'input-error' : ''}`}
                    />
                  </div>
                  {registerForm.formState.errors.email && (
                    <p className="text-xs text-red-600 mt-1">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Пароль (не короче 8 символов)</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      {...registerForm.register('password', {
                        required: 'Пароль обязателен',
                        minLength: { value: 8, message: 'Минимум 8 символов' },
                      })}
                      type={showPwd ? 'text' : 'password'}
                      className={`input pl-9 pr-10 ${registerForm.formState.errors.password ? 'input-error' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {registerForm.formState.errors.password && (
                    <p className="text-xs text-red-600 mt-1">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-6">
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

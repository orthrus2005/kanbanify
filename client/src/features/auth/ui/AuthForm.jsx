import React, { useState } from 'react';
import { ArrowRight, KeyRound, LayoutGrid, Mail } from 'lucide-react';
import { useAuthStore } from '../../../entities/session/model/authStore';

export const AuthForm = () => {
  const { signIn, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_32%)]" />

      <div className="relative w-full max-w-md rounded-[32px] border border-white/60 bg-white/78 p-6 shadow-[0_35px_100px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20">
            <LayoutGrid size={20} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Вход в Kanbanify</h1>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-600">Пароль</span>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
                className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Загрузка...' : 'Войти'}
            {!isLoading ? <ArrowRight size={16} /> : null}
          </button>
        </form>
      </div>
    </div>
  );
};

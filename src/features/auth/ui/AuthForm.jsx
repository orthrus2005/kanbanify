import React, { useState } from 'react';
import { useAuthStore } from '../../../entities/session/model/authStore';

export const AuthForm = () => {
  const { signIn, signUp, isLoading, error } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLogin) {
      await signIn(email, password);
    } else {
      await signUp(email, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200 mb-4">
             <div className="w-6 h-6 border-2 border-white rounded-md" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isLogin ? 'Вход в Kanbanify' : 'Регистрация'}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 disabled:opacity-50 transition-all shadow-lg shadow-red-200"
          >
            {isLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {isLogin ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-red-500 font-semibold hover:underline"
          >
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </p>
      </div>
    </div>
  );
};
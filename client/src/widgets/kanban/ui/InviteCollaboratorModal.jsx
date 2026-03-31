import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Mail, X } from 'lucide-react';

export const InviteCollaboratorModal = ({ isOpen, boardTitle, onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Введите email.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const result = await onInvite(normalizedEmail);

    if (result?.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[13000] flex items-center justify-center bg-slate-950/52 p-4 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Закрыть окно приглашения" onClick={onClose} />

      <form onSubmit={handleSubmit} className="relative z-[1] w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_30px_70px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Совместный доступ</div>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Пригласить по email</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Добавим участника в доску <span className="font-semibold text-slate-700">{boardTitle || 'без названия'}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-6 block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Mail size={15} />
            Email участника
          </span>
          <input
            autoFocus
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
        </label>

        {error ? <p className="mt-3 text-sm font-medium text-rose-500">{error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? 'Приглашаю...' : 'Добавить участника'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

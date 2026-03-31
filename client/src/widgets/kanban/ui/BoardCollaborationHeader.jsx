import React, { useMemo } from 'react';
import { Globe2, Lock, Share2, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../../entities/session/model/authStore';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const getInitials = (email) => {
  const base = (email || 'G').split('@')[0].replace(/[^a-zA-Zа-яА-Я0-9]/g, '');
  return base.slice(0, 2).toUpperCase() || 'G';
};

export const BoardCollaborationHeader = ({
  board,
  members = [],
  access,
  activeCollaborators = [],
  isSharing = false,
  onShare,
  onInvite,
  shareFeedback = '',
}) => {
  const user = useAuthStore((state) => state.user);

  const collaboratorEmails = useMemo(() => {
    const emails = [
      access?.isOwner && user?.email ? normalizeEmail(user.email) : null,
      ...members.map((member) => normalizeEmail(member.email)),
    ].filter(Boolean);

    return Array.from(new Map(emails.map((email) => [email, email])).values());
  }, [access?.isOwner, members, user?.email]);

  const activeEmailSet = useMemo(
    () => new Set(activeCollaborators.map((participant) => normalizeEmail(participant.email)).filter(Boolean)),
    [activeCollaborators]
  );

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-lg font-black tracking-tight text-slate-900">{board?.title || 'Доска'}</h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              access?.isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {access?.isPublic ? <Globe2 size={12} /> : <Lock size={12} />}
            {access?.isPublic ? 'Публичная' : 'Приватная'}
          </span>
          {!access?.canEdit ? <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">Только просмотр</span> : null}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {collaboratorEmails.length ? `Участники: ${collaboratorEmails.length}` : 'Пока без приглашённых участников'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center">
          {collaboratorEmails.slice(0, 6).map((email) => {
            const isActive = activeEmailSet.has(email);

            return (
              <div
                key={email}
                title={email}
                className={`-ml-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-black shadow-sm first:ml-0 ${
                  isActive ? 'bg-emerald-500 text-white ring-2 ring-emerald-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {getInitials(email)}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {access?.isOwner ? (
            <button
              type="button"
              onClick={onInvite}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/92 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
            >
              <UserPlus size={15} />
              Пригласить
            </button>
          ) : null}
          <button
            type="button"
            onClick={onShare}
            disabled={isSharing || (!access?.isPublic && !access?.isOwner)}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            <Share2 size={15} />
            {isSharing ? 'Подготавливаю...' : 'Поделиться'}
          </button>
        </div>
      </div>

      {shareFeedback ? <div className="w-full text-right text-xs font-semibold text-emerald-600">{shareFeedback}</div> : null}
    </div>
  );
};

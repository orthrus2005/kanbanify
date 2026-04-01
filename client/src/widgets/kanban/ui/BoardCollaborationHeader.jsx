import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe2, Lock, LogOut, Share2, Trash2, UserMinus, UserPlus, Users } from 'lucide-react';
import { useAuthStore } from '../../../entities/session/model/authStore';
import { useConfirmStore } from '../../../shared/model/confirmStore';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const getInitials = (email) => {
  const base = (email || 'G').split('@')[0].replace(/[^a-zA-Zа-яА-Я0-9]/g, '');
  return base.slice(0, 2).toUpperCase() || 'G';
};

const getDisplayName = (email) => {
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail.split('@')[0] || normalizedEmail || 'Участник';
};

export const BoardCollaborationHeader = ({
  board,
  members = [],
  access,
  activeCollaborators = [],
  isPublishing = false,
  isSharing = false,
  onPublish,
  onShare,
  onInvite,
  onDeleteBoard,
  onRemoveMember,
  onLeaveBoard,
  shareFeedback = '',
}) => {
  const user = useAuthStore((state) => state.user);
  const requestConfirm = useConfirmStore((state) => state.requestConfirm);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [memberFeedback, setMemberFeedback] = useState('');
  const [busyEmail, setBusyEmail] = useState('');
  const panelRef = useRef(null);
  const currentUserEmail = normalizeEmail(user?.email);

  const collaboratorEntries = useMemo(() => {
    const ownerEmail = access?.isOwner && currentUserEmail ? currentUserEmail : null;
    const emails = [ownerEmail, ...members.map((member) => normalizeEmail(member.email))].filter(Boolean);
    const uniqueEmails = Array.from(new Map(emails.map((email) => [email, email])).values());

    return uniqueEmails.map((email) => ({
      email,
      label: getDisplayName(email),
      isOwner: Boolean(ownerEmail && email === ownerEmail),
      isSelf: email === currentUserEmail,
    }));
  }, [access?.isOwner, currentUserEmail, members]);

  const activeEmailSet = useMemo(
    () => new Set(activeCollaborators.map((participant) => normalizeEmail(participant.email)).filter(Boolean)),
    [activeCollaborators]
  );

  useEffect(() => {
    if (!isMembersOpen) return undefined;

    const handleOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsMembersOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsMembersOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMembersOpen]);

  const handleRemoveMember = async (email) => {
    if (!onRemoveMember) return;

    const confirmed = await requestConfirm({
      title: 'Удалить участника',
      message: `Участник ${email} потеряет доступ к редактированию этой доски.`,
    });

    if (!confirmed) return;

    setBusyEmail(email);
    const result = await onRemoveMember(email);
    setBusyEmail('');

    if (result?.error) {
      setMemberFeedback(result.error);
      return;
    }

    setMemberFeedback('Участник удален.');
  };

  const handleLeaveBoard = async () => {
    if (!onLeaveBoard) return;

    const confirmed = await requestConfirm({
      title: 'Покинуть доску',
      message: 'Вы потеряете доступ к редактированию этой доски. Если доска публичная, она останется доступной только для просмотра.',
    });

    if (!confirmed) return;

    setBusyEmail(currentUserEmail || '__self__');
    const result = await onLeaveBoard();
    setBusyEmail('');

    if (result?.error) {
      setMemberFeedback(result.error);
      return;
    }

    setIsMembersOpen(false);
    setMemberFeedback('');
  };

  const handleDeleteBoard = async () => {
    if (!onDeleteBoard || !board?.title) return;

    const confirmed = await requestConfirm({
      title: 'Удалить доску',
      message: `Доска "${board.title}" будет удалена без возможности восстановления.`,
    });

    if (!confirmed) return;

    const result = await onDeleteBoard();
    if (result?.error) {
      setMemberFeedback(result.error);
      return;
    }

    setIsMembersOpen(false);
    setMemberFeedback('');
  };

  return (
    <div className="flex flex-col gap-4">
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
          {!access?.canEdit ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">Только просмотр</span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {collaboratorEntries.length ? `Участники: ${collaboratorEntries.length}` : 'Пока без приглашенных участников'}
        </p>
      </div>

      <div className="flex flex-col items-start gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMembersOpen((value) => !value)}
            className="flex items-center rounded-2xl border border-slate-200 bg-white/92 px-2 py-2 transition hover:border-slate-300 hover:bg-white"
          >
            <div className="flex items-center">
              {collaboratorEntries.slice(0, 6).map((entry) => {
                const isActive = activeEmailSet.has(entry.email);

                return (
                  <div
                    key={entry.email}
                    title={entry.email}
                    className={`-ml-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-xs font-black shadow-sm first:ml-0 ${
                      isActive ? 'bg-emerald-500 text-white ring-2 ring-emerald-200' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {getInitials(entry.email)}
                  </div>
                );
              })}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsMembersOpen((value) => !value)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/92 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
          >
            <Users size={15} />
            Участники
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

          {access?.isOwner ? (
            <button
              type="button"
              onClick={handleDeleteBoard}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              <Trash2 size={15} />
              Удалить доску
            </button>
          ) : null}

          {access?.isOwner && !access?.isPublic ? (
            <button
              type="button"
              onClick={onPublish}
              disabled={isPublishing}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Globe2 size={15} />
              {isPublishing ? 'Публикую...' : 'Сделать публичной'}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onShare}
            disabled={isSharing || !access?.isPublic}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            <Share2 size={15} />
            {isSharing ? 'Подготавливаю...' : 'Поделиться'}
          </button>
        </div>
      </div>

      {isMembersOpen ? (
        <div ref={panelRef} className="rounded-[24px] border border-slate-200 bg-white/92 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">Участники доски</div>
              <div className="text-xs text-slate-500">Управление доступом и составом команды</div>
            </div>
            <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">{collaboratorEntries.length}</div>
          </div>

          <div className="space-y-2">
            {collaboratorEntries.length ? (
              collaboratorEntries.map((entry) => {
                const isActive = activeEmailSet.has(entry.email);
                const canRemove = access?.isOwner && !entry.isOwner;
                const isBusy = busyEmail === entry.email;

                return (
                  <div key={entry.email} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                          isActive ? 'bg-emerald-500 text-white ring-2 ring-emerald-200' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {getInitials(entry.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">{entry.label}</span>
                          {entry.isOwner ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Создатель</span> : null}
                          {entry.isSelf ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Вы</span> : null}
                          {isActive ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Онлайн</span> : null}
                        </div>
                        <div className="truncate text-xs text-slate-500">{entry.email}</div>
                      </div>
                    </div>

                    {canRemove ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(entry.email)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <UserMinus size={13} />
                        Удалить
                      </button>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Пока нет приглашенных участников.
              </div>
            )}
          </div>

          {access?.isMember && !access?.isOwner ? (
            <button
              type="button"
              onClick={handleLeaveBoard}
              disabled={busyEmail === (currentUserEmail || '__self__')}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut size={15} />
              Покинуть доску
            </button>
          ) : null}

          {memberFeedback ? <div className="mt-3 text-xs font-semibold text-slate-500">{memberFeedback}</div> : null}
        </div>
      ) : null}

      {shareFeedback ? <div className="text-xs font-semibold text-emerald-600">{shareFeedback}</div> : null}
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AlignLeft, Archive, ArchiveRestore, CalendarDays, MoreHorizontal, PaintBucket, Tag, Trash2, X } from 'lucide-react';
import { useBoardStore } from '../../board/model/store';
import { useAuthStore } from '../../session/model/authStore';
import { useConfirmStore } from '../../../shared/model/confirmStore';

const CARD_COLORS = ['#334155', '#2563eb', '#059669', '#d97706', '#e11d48', '#7c3aed'];

const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;

  const normalized = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const getCardStyle = (color, transform, isDragging, isOverlay) => ({
  transform: isOverlay ? undefined : CSS.Translate.toString(transform),
  opacity: isDragging && !isOverlay ? 0.35 : 1,
  borderColor: color || undefined,
  background: color ? `linear-gradient(180deg, ${hexToRgba(color, 0.22)} 0%, rgba(255, 255, 255, 0.97) 82%)` : undefined,
  boxShadow: color ? `0 14px 30px rgba(15, 23, 42, 0.1), inset 0 0 0 1px ${hexToRgba(color, 0.2)}` : undefined,
});

const getCreatorLabel = (creatorEmail, creatorUserId, currentUser) => {
  if (creatorEmail) {
    return creatorEmail.split('@')[0] || creatorEmail;
  }

  if (currentUser?.id && creatorUserId === currentUser.id) {
    return 'Вы';
  }

  return 'Участник';
};

export const TaskCard = ({ task, isOverlay = false, dndId }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [edit, setEdit] = useState({
    title: task.title,
    desc: task.description || '',
    date: task.due_date?.slice(0, 16) || '',
    color: task.color || '',
  });

  const { columns, currentBoardAccess, updateTask, deleteTask, archiveTask, unarchiveTask } = useBoardStore();
  const requestConfirm = useConfirmStore((state) => state.requestConfirm);
  const currentUser = useAuthStore((state) => state.user);
  const dragFlagRef = useRef(false);
  const menuRef = useRef(null);
  const modalRef = useRef(null);
  const canEditCurrentBoard = Boolean(currentBoardAccess?.canEdit);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId || `task:${task.id}`,
    disabled: isMenuOpen || isModalOpen || task.is_archived || isOverlay || !canEditCurrentBoard,
  });

  useEffect(() => {
    setEdit({
      title: task.title,
      desc: task.description || '',
      date: task.due_date?.slice(0, 16) || '',
      color: task.color || '',
    });
  }, [task.id, task.title, task.description, task.due_date, task.color]);

  useEffect(() => {
    if (isDragging) dragFlagRef.current = true;
  }, [isDragging]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };

    const handlePointerDown = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handlePointerDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handlePointerDown);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const style = getCardStyle(task.color, transform, isDragging, isOverlay);

  const columnTitle = useMemo(
    () => columns.find((column) => column.id === task.column_id)?.title ?? 'Без колонки',
    [columns, task.column_id]
  );

  const dueLabel = task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : null;
  const creatorLabel = getCreatorLabel(task.creator_email, task.user_id, currentUser);

  const baseChipStyle = task.color
    ? {
        backgroundColor: hexToRgba(task.color, 0.14),
        color: '#334155',
        border: `1px solid ${hexToRgba(task.color, 0.18)}`,
      }
    : undefined;

  const dueChipStyle = task.color
    ? {
        backgroundColor: hexToRgba(task.color, 0.2),
        color: '#1d4ed8',
        border: `1px solid ${hexToRgba(task.color, 0.22)}`,
      }
    : undefined;

  const openTaskModal = () => {
    if (dragFlagRef.current) {
      dragFlagRef.current = false;
      return;
    }

    setIsMenuOpen(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!canEditCurrentBoard) {
      setIsModalOpen(false);
      return;
    }

    await updateTask(task.id, {
      title: edit.title.trim() || task.title,
      description: edit.desc,
      due_date: edit.date || null,
      color: edit.color || null,
    });
    setIsModalOpen(false);
  };

  const handleDelete = async (event) => {
    event.stopPropagation();
    const ok = await requestConfirm({
      title: 'Удалить задачу',
      message: `Карточка "${task.title}" будет удалена без возможности восстановления.`,
    });

    if (!ok) return;

    await deleteTask(task.id);
    setIsMenuOpen(false);
  };

  const modalMarkup =
    isModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md sm:p-6">
            <div ref={modalRef} className="kb-edit-modal mx-auto max-h-[calc(100dvh-24px)] w-full max-w-5xl overflow-y-auto rounded-[28px] sm:max-h-[calc(100dvh-48px)]">
              <div className="border-b border-slate-200/70 px-5 py-4 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="kb-chip bg-slate-100 text-slate-700" style={baseChipStyle}>
                        <Tag size={12} />
                        {columnTitle}
                      </span>
                      {edit.date ? (
                        <span className="kb-chip bg-blue-100 text-blue-700" style={dueChipStyle}>
                          <CalendarDays size={12} />
                          {new Date(edit.date).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                      {canEditCurrentBoard ? 'Редактирование задачи' : 'Просмотр задачи'}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Закрыть"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-7 sm:py-7">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
                  <div className="space-y-6">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-600">Название</span>
                      <input
                        value={edit.title}
                        readOnly={!canEditCurrentBoard}
                        onChange={(event) => setEdit((state) => ({ ...state, title: event.target.value }))}
                        placeholder="Название задачи"
                        className="kb-edit-input px-4 py-3 read-only:cursor-default read-only:opacity-90"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <AlignLeft size={15} />
                        Описание
                      </span>
                      <textarea
                        rows={10}
                        value={edit.desc}
                        readOnly={!canEditCurrentBoard}
                        onChange={(event) => setEdit((state) => ({ ...state, desc: event.target.value }))}
                        placeholder="Добавьте описание задачи"
                        className="kb-edit-input min-h-[220px] resize-y px-4 py-3 sm:min-h-[320px] read-only:cursor-default read-only:opacity-90"
                      />
                    </label>
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5">
                      <div className="mb-2 text-sm font-semibold text-slate-700">Колонка</div>
                      <div className="break-words text-sm text-slate-500">{columnTitle}</div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <PaintBucket size={15} />
                        Цвет карточки
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {CARD_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            disabled={!canEditCurrentBoard}
                            onClick={() => setEdit((state) => ({ ...state, color }))}
                            className={`h-11 rounded-2xl border ${edit.color === color ? 'border-slate-900' : 'border-slate-200'} disabled:cursor-not-allowed disabled:opacity-60`}
                            style={{ backgroundColor: color }}
                            aria-label={`Выбрать цвет ${color}`}
                          />
                        ))}
                      </div>
                      {canEditCurrentBoard ? (
                        <button
                          type="button"
                          onClick={() => setEdit((state) => ({ ...state, color: '' }))}
                          className="mt-3 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                        >
                          Сбросить цвет
                        </button>
                      ) : null}
                    </div>

                    <label className="block rounded-3xl border border-slate-200 bg-slate-50/85 p-5">
                      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CalendarDays size={15} />
                        Срок выполнения
                      </span>
                      <input
                        type="datetime-local"
                        value={edit.date}
                        disabled={!canEditCurrentBoard}
                        onChange={(event) => setEdit((state) => ({ ...state, date: event.target.value }))}
                        className="kb-edit-input min-w-0 px-3 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      {canEditCurrentBoard ? (
                        <button
                          type="button"
                          onClick={() => setEdit((state) => ({ ...state, date: '' }))}
                          className="mt-3 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                        >
                          Очистить дату
                        </button>
                      ) : null}
                    </label>
                  </aside>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200/70 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                >
                  Закрыть
                </button>
                {canEditCurrentBoard ? (
                  <button
                    type="button"
                    onClick={handleSave}
                    className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                  >
                    Сохранить
                  </button>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div ref={setNodeRef} style={style} onClick={openTaskModal} className={`kb-card group relative ${isOverlay ? 'kb-card--overlay' : ''}`}>
        {!isOverlay && canEditCurrentBoard ? (
          <div ref={menuRef} className="absolute right-2 top-2 z-20">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsMenuOpen((value) => !value);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
              aria-label="Открыть меню карточки"
            >
              <MoreHorizontal size={16} />
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 top-10 z-30 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {task.is_archived ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      unarchiveTask(task.id);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                  >
                    <ArchiveRestore size={14} />
                    Вернуть из архива
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      archiveTask(task.id);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                  >
                    <Archive size={14} />
                    В архив
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-500 transition hover:bg-rose-50"
                >
                  <Trash2 size={14} />
                  Удалить
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className="space-y-3"
          {...attributes}
          {...listeners}
          onPointerDownCapture={() => {
            dragFlagRef.current = false;
          }}
        >
          <div className="flex flex-wrap gap-2 pr-8">
            <span className="kb-chip bg-slate-100 text-slate-700" style={baseChipStyle}>
              <Tag size={12} />
              {columnTitle}
            </span>
            {dueLabel ? (
              <span className="kb-chip bg-blue-100 text-blue-700" style={dueChipStyle}>
                <CalendarDays size={12} />
                {dueLabel}
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            <h4 className="text-[15px] font-bold text-slate-800">{task.title}</h4>
            {task.description ? <p className="line-clamp-3 text-sm leading-6 text-slate-500">{task.description}</p> : null}
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
            <span className="truncate" title={task.creator_email || creatorLabel}>
              Создал: {creatorLabel}
            </span>
            {task.due_date ? <span>{new Date(task.due_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span> : null}
          </div>
        </div>
      </div>

      {modalMarkup}
    </>
  );
};

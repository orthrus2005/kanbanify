import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AlignLeft, ArchiveRestore, CalendarDays, Clock3, MoreHorizontal, Tag, Trash2, X } from 'lucide-react';
import { useBoardStore } from '../../board/model/store';
import { useConfirmStore } from '../../../shared/model/confirmStore';

export const InboxIdeaCard = ({ idea, showArchived = false, isOverlay = false, dndId }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [edit, setEdit] = useState({
    title: idea.title,
    desc: idea.description || '',
    date: idea.due_date?.slice(0, 16) || '',
  });

  const { updateInboxIdea, archiveInboxIdea, unarchiveInboxIdea, deleteInboxIdea } = useBoardStore();
  const requestConfirm = useConfirmStore((state) => state.requestConfirm);
  const menuRef = useRef(null);
  const modalRef = useRef(null);
  const dragFlagRef = useRef(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId || `inbox:${idea.id}`,
    disabled: showArchived || isMenuOpen || isModalOpen || isOverlay,
  });

  useEffect(() => {
    setEdit({
      title: idea.title,
      desc: idea.description || '',
      date: idea.due_date?.slice(0, 16) || '',
    });
  }, [idea.id, idea.title, idea.description, idea.due_date]);

  useEffect(() => {
    if (isDragging) dragFlagRef.current = true;
  }, [isDragging]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };
    const handleOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) setIsModalOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleOutside);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleOutside);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const style = {
    transform: isOverlay ? undefined : CSS.Translate.toString(transform),
    opacity: isDragging && !isOverlay ? 0.35 : 1,
  };

  const dueLabel = idea.due_date
    ? new Date(idea.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : null;

  const openModal = () => {
    if (dragFlagRef.current) {
      dragFlagRef.current = false;
      return;
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    updateInboxIdea(idea.id, {
      title: edit.title.trim() || idea.title,
      description: edit.desc,
      due_date: edit.date || null,
    });
    setIsModalOpen(false);
  };

  const modalMarkup =
    isModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md sm:p-6">
            <div ref={modalRef} className="kb-edit-modal mx-auto max-h-[calc(100dvh-24px)] w-full max-w-4xl overflow-y-auto rounded-[28px] sm:max-h-[calc(100dvh-48px)]">
              <div className="border-b border-slate-200/70 px-5 py-4 sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="kb-chip bg-slate-100 text-slate-700">
                        <Tag size={12} />
                        Inbox
                      </span>
                      {edit.date ? (
                        <span className="kb-chip bg-blue-100 text-blue-700">
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
                    <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Редактирование задумки</h3>
                  </div>

                  <button onClick={() => setIsModalOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-7 sm:py-7">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_320px]">
                  <div className="space-y-6">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-slate-600">Название</span>
                      <input
                        value={edit.title}
                        onChange={(event) => setEdit((state) => ({ ...state, title: event.target.value }))}
                        placeholder="Название задумки"
                        className="kb-edit-input px-4 py-3"
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
                        onChange={(event) => setEdit((state) => ({ ...state, desc: event.target.value }))}
                        placeholder="Опишите идею или черновую задумку"
                        className="kb-edit-input min-h-[220px] resize-y px-4 py-3"
                      />
                    </label>
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5">
                      <div className="mb-2 text-sm font-semibold text-slate-700">Тип</div>
                      <div className="text-sm text-slate-500">Задумка для Inbox</div>
                    </div>

                    <label className="block rounded-3xl border border-slate-200 bg-slate-50/85 p-5">
                      <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <CalendarDays size={15} />
                        Срок
                      </span>
                      <input
                        type="datetime-local"
                        value={edit.date}
                        onChange={(event) => setEdit((state) => ({ ...state, date: event.target.value }))}
                        className="kb-edit-input min-w-0 px-3 py-2.5"
                      />
                      <button
                        type="button"
                        onClick={() => setEdit((state) => ({ ...state, date: '' }))}
                        className="mt-3 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                      >
                        Очистить дату
                      </button>
                    </label>
                  </aside>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200/70 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={openModal}
        className={`kb-card kb-card--inbox group relative ${isOverlay ? 'kb-card--overlay' : ''}`}
      >
        {!isOverlay && (
          <div ref={menuRef} className="absolute right-2 top-2 z-20">
            <button
              onClick={(event) => {
                event.stopPropagation();
                setIsMenuOpen((value) => !value);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 opacity-100 transition hover:bg-white/10 hover:text-white"
            >
              <MoreHorizontal size={16} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-10 z-30 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {showArchived ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      unarchiveInboxIdea(idea.id);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                  >
                    <ArchiveRestore size={14} />
                    Вернуть из архива
                  </button>
                ) : (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      archiveInboxIdea(idea.id);
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
                  >
                    <ArchiveRestore size={14} />
                    В архив
                  </button>
                )}

                <button
                  onClick={async (event) => {
                    event.stopPropagation();
                    const ok = await requestConfirm({
                      title: 'Удалить задумку',
                      message: `Задумка "${idea.title}" будет удалена без возможности восстановления.`,
                    });
                    if (ok) {
                      deleteInboxIdea(idea.id);
                      setIsMenuOpen(false);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 size={14} />
                  Удалить
                </button>
              </div>
            )}
          </div>
        )}

        <div {...(isOverlay ? {} : listeners)} {...(isOverlay ? {} : attributes)} className={isOverlay ? '' : 'kb-dnd-handle'}>
          <h4 className="pr-8 text-sm font-bold leading-6 text-white">{idea.title}</h4>

          {idea.description ? <p className="mt-2 text-sm leading-6 text-slate-400">{idea.description}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {dueLabel ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 size={12} />
                {dueLabel}
              </span>
            ) : (
              <span>Без срока</span>
            )}
          </div>
        </div>
      </div>

      {modalMarkup}
    </>
  );
};

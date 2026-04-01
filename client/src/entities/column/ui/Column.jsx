import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Palette, Trash2 } from 'lucide-react';
import { useBoardStore } from '../../board/model/store';
import { TaskCard } from '../../task/ui/TaskCard';
import { AddTaskForm } from '../../task/create/ui/AddTaskForm';
import { useConfirmStore } from '../../../shared/model/confirmStore';
import { useAuthStore } from '../../session/model/authStore';

const COLUMN_COLOR_PRESETS = [
  {
    id: 'slate',
    label: 'Slate',
    border: '#cbd5e1',
    soft: 'linear-gradient(180deg, rgba(255,255,255,0.94), rgba(241,245,249,0.96))',
    collapsed: '#f8fafc',
  },
  {
    id: 'blue',
    label: 'Blue',
    border: '#93c5fd',
    soft: 'linear-gradient(180deg, rgba(239,246,255,0.98), rgba(219,234,254,0.94))',
    collapsed: '#eff6ff',
  },
  {
    id: 'emerald',
    label: 'Emerald',
    border: '#86efac',
    soft: 'linear-gradient(180deg, rgba(236,253,245,0.98), rgba(209,250,229,0.94))',
    collapsed: '#ecfdf5',
  },
  {
    id: 'amber',
    label: 'Amber',
    border: '#fcd34d',
    soft: 'linear-gradient(180deg, rgba(255,251,235,0.98), rgba(254,243,199,0.94))',
    collapsed: '#fffbeb',
  },
  {
    id: 'rose',
    label: 'Rose',
    border: '#fda4af',
    soft: 'linear-gradient(180deg, rgba(255,241,242,0.98), rgba(255,228,230,0.94))',
    collapsed: '#fff1f2',
  },
  {
    id: 'violet',
    label: 'Violet',
    border: '#c4b5fd',
    soft: 'linear-gradient(180deg, rgba(245,243,255,0.98), rgba(237,233,254,0.94))',
    collapsed: '#f5f3ff',
  },
];

const getColumnUiKey = (userId, boardId, columnId) =>
  `kanbanify-column-ui-${userId || 'guest'}-${boardId || 'board'}-${columnId}`;

const getCreatorLabel = (creatorEmail, creatorUserId, currentUser) => {
  if (creatorEmail) {
    return creatorEmail.split('@')[0] || creatorEmail;
  }

  if (currentUser?.id && creatorUserId === currentUser.id) {
    return 'Вы';
  }

  return 'Участник';
};

export const Column = ({ column, tasks }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${column.id}` });
  const { addTask, deleteColumn, updateColumnTitle, currentBoardId, currentBoardAccess } = useBoardStore();
  const requestConfirm = useConfirmStore((state) => state.requestConfirm);
  const user = useAuthStore((state) => state.user);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const [colorId, setColorId] = useState('slate');
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);

  const titleInputRef = useRef(null);
  const colorMenuRef = useRef(null);
  const canEditCurrentBoard = Boolean(currentBoardAccess?.canEdit);
  const creatorLabel = getCreatorLabel(column.creator_email, column.user_id, user);

  useEffect(() => {
    setTitleDraft(column.title);
  }, [column.title]);

  useEffect(() => {
    const storageKey = getColumnUiKey(user?.id, currentBoardId, column.id);

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setIsCollapsed(false);
        setColorId('slate');
        return;
      }

      const parsed = JSON.parse(raw);
      setIsCollapsed(Boolean(parsed?.collapsed));
      setColorId(parsed?.colorId || 'slate');
    } catch {
      setIsCollapsed(false);
      setColorId('slate');
    }
  }, [user?.id, currentBoardId, column.id]);

  useEffect(() => {
    const storageKey = getColumnUiKey(user?.id, currentBoardId, column.id);
    window.localStorage.setItem(storageKey, JSON.stringify({ collapsed: isCollapsed, colorId }));
  }, [user?.id, currentBoardId, column.id, isCollapsed, colorId]);

  useEffect(() => {
    if (!isEditingTitle) return undefined;

    const frame = requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, [isEditingTitle]);

  useEffect(() => {
    if (!isColorMenuOpen) return undefined;

    const handleOutside = (event) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(event.target)) {
        setIsColorMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isColorMenuOpen]);

  const activeColor = useMemo(
    () => COLUMN_COLOR_PRESETS.find((preset) => preset.id === colorId) ?? COLUMN_COLOR_PRESETS[0],
    [colorId]
  );

  const handleDeleteColumn = async () => {
    if (!canEditCurrentBoard) return;

    const ok = await requestConfirm({
      title: 'Удалить колонку',
      message: `Колонка "${column.title}" и все её карточки будут удалены.`,
    });

    if (ok) {
      deleteColumn(column.id);
    }
  };

  const handleTitleSave = async () => {
    if (!canEditCurrentBoard) {
      setIsEditingTitle(false);
      setTitleDraft(column.title);
      return;
    }

    const trimmedTitle = titleDraft.trim();
    setIsEditingTitle(false);

    if (!trimmedTitle || trimmedTitle === column.title) {
      setTitleDraft(column.title);
      return;
    }

    const updated = await updateColumnTitle(column.id, trimmedTitle);
    if (!updated) {
      setTitleDraft(column.title);
    }
  };

  return (
    <div
      className={`kb-column flex shrink-0 flex-col overflow-visible transition-[width] duration-100 ${
        isCollapsed ? 'w-[88px]' : 'w-[320px]'
      }`}
      style={{
        background: isCollapsed ? activeColor.collapsed : activeColor.soft,
        borderColor: activeColor.border,
      }}
    >
      <div className={`mb-4 flex items-start gap-2 ${isCollapsed ? 'flex-col items-center px-0' : 'justify-between px-1'}`}>
        <div className={`min-w-0 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleTitleSave();
                if (event.key === 'Escape') {
                  setTitleDraft(column.title);
                  setIsEditingTitle(false);
                }
              }}
              className={`rounded-xl border border-slate-300 bg-white/90 px-3 py-2 text-sm font-bold text-slate-700 outline-none ring-4 ring-blue-100 ${
                isCollapsed ? 'w-[64px] text-center' : 'w-full'
              }`}
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => {
                if (canEditCurrentBoard) setIsEditingTitle(true);
              }}
              className={`text-left ${isCollapsed ? 'flex h-[150px] items-center justify-center' : ''}`}
              title={canEditCurrentBoard ? 'Двойной клик для переименования' : column.title}
            >
              <h3
                className={`font-black uppercase tracking-[0.18em] text-slate-700 ${
                  isCollapsed ? '[writing-mode:vertical-rl] rotate-180 text-[11px]' : 'truncate text-sm'
                }`}
              >
                {column.title}
              </h3>
            </button>
          )}

          <p className={`mt-1 text-xs font-medium text-slate-500 ${isCollapsed ? 'text-center' : ''}`}>{tasks.length}</p>
          {!isCollapsed ? (
            <p className="mt-1 truncate text-[11px] font-medium text-slate-400" title={column.creator_email || creatorLabel}>
              Создал: {creatorLabel}
            </p>
          ) : null}
        </div>

        <div className={`relative flex gap-1 ${isCollapsed ? 'mt-1 flex-col' : ''}`} ref={colorMenuRef}>
          <button
            type="button"
            onClick={() => setIsCollapsed((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/60 hover:text-slate-800"
            aria-label={isCollapsed ? 'Развернуть колонку' : 'Свернуть колонку'}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {canEditCurrentBoard ? (
            <button
              type="button"
              onClick={() => setIsColorMenuOpen((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/60 hover:text-slate-800"
              aria-label="Изменить цвет колонки"
            >
              <Palette size={16} />
            </button>
          ) : null}

          {!isCollapsed && canEditCurrentBoard ? (
            <button
              type="button"
              onClick={handleDeleteColumn}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-rose-50 hover:text-rose-500"
              aria-label="Удалить колонку"
            >
              <Trash2 size={16} />
            </button>
          ) : null}

          {isColorMenuOpen && canEditCurrentBoard ? (
            <div className={`absolute z-30 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${isCollapsed ? 'left-full top-0 ml-2' : 'right-0 top-10'}`}>
              <div className="grid grid-cols-3 gap-2">
                {COLUMN_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setColorId(preset.id);
                      setIsColorMenuOpen(false);
                    }}
                    className="h-9 w-9 rounded-xl border border-slate-200"
                    style={{ background: preset.soft }}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`kb-dropzone flex flex-col gap-3 ${isOver ? 'kb-dropzone--over' : ''} ${isCollapsed ? 'min-h-[120px] items-center justify-center' : ''}`}
      >
        {!isCollapsed ? (
          tasks.length > 0 ? (
            tasks.map((task) => <TaskCard key={task.id} task={task} dndId={`task:${task.id}`} />)
          ) : (
            <div className="kb-empty">Перетащите карточку сюда или создайте новую ниже.</div>
          )
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300/80 bg-white/50 px-3 py-6 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Drop
          </div>
        )}
      </div>

      {!isCollapsed ? (
        <div className="mt-4">
          <AddTaskForm onAdd={(title) => addTask(column.id, title)} disabled={!canEditCurrentBoard} />
        </div>
      ) : null}
    </div>
  );
};

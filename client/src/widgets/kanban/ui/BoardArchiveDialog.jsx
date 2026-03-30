import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, ArchiveRestore, Clock3, Trash2, X } from 'lucide-react';
import { useBoardStore } from '../../../entities/board/model/store';
import { useConfirmStore } from '../../../shared/model/confirmStore';

const formatDueDate = (value) => {
  if (!value) return null;

  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const BoardArchiveDialog = ({ isOpen, onClose }) => {
  const { currentBoardId, archivedTasks, columns, fetchArchivedTasks, unarchiveTask, deleteTask } = useBoardStore();
  const requestConfirm = useConfirmStore((state) => state.requestConfirm);
  const [isLoading, setIsLoading] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    let isActive = true;
    setIsLoading(true);

    Promise.resolve(currentBoardId ? fetchArchivedTasks(currentBoardId) : [])
      .catch(() => [])
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [isOpen, currentBoardId, fetchArchivedTasks]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const handlePointerDown = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  const groupedTasks = useMemo(() => {
    const columnsById = new Map(columns.map((column) => [column.id, column.title]));
    const groups = new Map();

    archivedTasks.forEach((task) => {
      const columnTitle = columnsById.get(task.column_id) || 'Без колонки';
      if (!groups.has(columnTitle)) {
        groups.set(columnTitle, []);
      }

      groups.get(columnTitle).push(task);
    });

    return Array.from(groups.entries()).map(([title, tasks]) => ({
      title,
      tasks,
    }));
  }, [archivedTasks, columns]);

  const handleDeleteTask = async (task) => {
    const ok = await requestConfirm({
      title: 'Удалить задачу',
      message: `Задача "${task.title}" будет удалена без возможности восстановления.`,
    });

    if (ok) {
      await deleteTask(task.id);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[1350] flex items-center justify-center bg-slate-950/56 p-3 backdrop-blur-md sm:p-6">
      <div
        ref={dialogRef}
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/14 bg-white/92 shadow-[0_40px_100px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:max-h-[calc(100dvh-48px)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-slate-500">
              <Archive size={16} />
              <span className="text-xs font-black uppercase tracking-[0.24em]">Архив</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight text-slate-900">Архив задач</h3>
            <p className="mt-1 text-sm text-slate-500">
              Здесь лежат задачи, отправленные в архив. Их можно вернуть обратно в исходную колонку или удалить.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Закрыть архив"
          >
            <X size={18} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {isLoading ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-sm text-slate-500">
              Загружаю архивные задачи...
            </div>
          ) : !currentBoardId ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-sm text-slate-500">
              Сначала откройте доску, чтобы посмотреть ее архив.
            </div>
          ) : !groupedTasks.length ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-sm text-slate-500">
              В архиве этой доски пока ничего нет.
            </div>
          ) : (
            <div className="space-y-6">
              {groupedTasks.map((group) => (
                <section key={group.title} className="rounded-[26px] border border-slate-200/90 bg-white/88 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Колонка</div>
                      <h4 className="mt-1 text-lg font-black tracking-tight text-slate-900">{group.title}</h4>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">{group.tasks.length}</div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {group.tasks.map((task) => (
                      <article
                        key={task.id}
                        className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h5 className="truncate text-base font-black tracking-tight text-slate-900">{task.title}</h5>
                            {task.description ? (
                              <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p>
                            ) : (
                              <p className="mt-2 text-sm text-slate-400">Без описания</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-600">
                            {group.title}
                          </span>
                          {task.due_date ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              <Clock3 size={12} />
                              {formatDueDate(task.due_date)}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => unarchiveTask(task.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                          >
                            <ArchiveRestore size={15} />
                            Вернуть из архива
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 size={15} />
                            Удалить
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

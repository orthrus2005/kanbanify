import React, { useState } from 'react';
import { Archive } from 'lucide-react';
import { useBoardStore } from '../../../entities/board/model/store';
import { BoardArchiveDialog } from './BoardArchiveDialog';

export const BoardWorkspacePanel = ({ children }) => {
  const currentBoardId = useBoardStore((state) => state.currentBoardId);
  const archivedTasks = useBoardStore((state) => state.archivedTasks);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);

  return (
    <>
      <section className="kb-board-workspace flex h-full min-h-0 flex-1 self-stretch overflow-hidden rounded-[30px] border border-white/12 shadow-[0_22px_52px_rgba(15,23,42,0.18)]">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-white/10 px-3 py-3 sm:px-5">
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsArchiveOpen(true)}
                disabled={!currentBoardId}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Archive size={16} />
                Архив задач
                {archivedTasks.length ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{archivedTasks.length}</span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="custom-scrollbar flex-1 overflow-auto px-3 py-3 sm:px-5 sm:py-5">
            <div className="flex min-h-full min-w-max items-start gap-3 sm:gap-5">{children}</div>
          </div>
        </div>
      </section>

      <BoardArchiveDialog isOpen={isArchiveOpen} onClose={() => setIsArchiveOpen(false)} />
    </>
  );
};

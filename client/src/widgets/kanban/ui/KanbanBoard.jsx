import React, { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, closestCorners, pointerWithin, useSensor, useSensors } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useBoardStore } from '../../../entities/board/model/store';
import { Column } from '../../../entities/column/ui/Column';
import { InboxColumn } from '../../../entities/inbox/ui/InboxColumn';
import { InboxIdeaCard } from '../../../entities/inbox/ui/InboxIdeaCard';
import { TaskCard } from '../../../entities/task/ui/TaskCard';
import { InboxWorkspace } from './InboxWorkspace';
import { BoardWorkspace } from './BoardWorkspace';
import { BoardCollaborationHeader } from './BoardCollaborationHeader';
import { InviteCollaboratorModal } from './InviteCollaboratorModal';

const parseDndId = (value) => {
  if (typeof value !== 'string') return { type: '', id: '' };

  const [type, ...rest] = value.split(':');
  return { type, id: rest.join(':') };
};

export const KanbanBoard = ({ showInbox = true, inboxOnly = false, showHeader = true, inboxExpanded = false, splitMiddlePanel = null }) => {
  const {
    boards,
    publicBoards,
    currentBoardRecord,
    boardMembers,
    activeCollaborators,
    currentBoardAccess,
    columns,
    tasks,
    inboxIdeas,
    currentBoardId,
    moveTask,
    moveTaskToInbox,
    moveInboxIdeaToColumn,
    addColumn,
    shareCurrentBoard,
    inviteBoardMember,
    removeBoardMember,
    leaveBoard,
  } = useBoardStore();

  const [activeItem, setActiveItem] = useState(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [columnTitle, setColumnTitle] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSharingBoard, setIsSharingBoard] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 40, tolerance: 4 } })
  );

  const currentBoard = useMemo(
    () => currentBoardRecord || [...boards, ...publicBoards].find((board) => board.id === currentBoardId) || null,
    [boards, currentBoardId, currentBoardRecord, publicBoards]
  );

  const canEditCurrentBoard = Boolean(currentBoardAccess?.canEdit);
  const shouldRenderBoardColumns = !inboxOnly;
  const shouldRenderSplitPanels = showInbox && shouldRenderBoardColumns;

  const collisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    return pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args);
  };

  const handleDragStart = (event) => {
    if (!canEditCurrentBoard) return;

    const parsed = parseDndId(event.active.id);

    if (parsed.type === 'task') {
      const task = tasks.find((item) => item.id === parsed.id);
      setActiveItem(task ? { type: 'task', data: task } : null);
      return;
    }

    if (parsed.type === 'inbox') {
      const idea = inboxIdeas.find((item) => item.id === parsed.id);
      setActiveItem(idea ? { type: 'inbox', data: idea } : null);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!canEditCurrentBoard || !over || active.id === over.id) return;

    const activeParsed = parseDndId(active.id);
    const overParsed = parseDndId(over.id);
    const targetColumnId =
      overParsed.type === 'column'
        ? overParsed.id
        : overParsed.type === 'task'
          ? tasks.find((item) => item.id === overParsed.id)?.column_id
          : null;
    const isInboxTarget = showInbox && (over.id === 'inbox' || overParsed.type === 'inbox');

    if (activeParsed.type === 'task') {
      const sourceTask = tasks.find((item) => item.id === activeParsed.id);

      if (targetColumnId && sourceTask?.column_id !== targetColumnId) {
        await moveTask(activeParsed.id, targetColumnId);
        return;
      }

      if (isInboxTarget) {
        await moveTaskToInbox(activeParsed.id);
      }
      return;
    }

    if (showInbox && activeParsed.type === 'inbox' && targetColumnId) {
      await moveInboxIdeaToColumn(activeParsed.id, targetColumnId);
    }
  };

  const handleAddColumn = async (event) => {
    event.preventDefault();
    if (!canEditCurrentBoard || !columnTitle.trim()) return;

    await addColumn(currentBoardId, columnTitle.trim());
    setColumnTitle('');
    setIsAddingColumn(false);
  };

  const handleShareBoard = async () => {
    setIsSharingBoard(true);
    setShareFeedback('');

    try {
      const shareUrl =
        currentBoardAccess?.isPublic && currentBoardAccess?.shareId
          ? `${window.location.origin}/board/${currentBoardAccess.shareId}`
          : await shareCurrentBoard();

      if (!shareUrl) {
        setShareFeedback('Не удалось подготовить ссылку.');
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback('Публичная ссылка скопирована.');
      window.setTimeout(() => setShareFeedback(''), 2400);
    } catch {
      setShareFeedback('Не удалось скопировать ссылку.');
    } finally {
      setIsSharingBoard(false);
    }
  };

  const boardHeader = currentBoard ? (
    <BoardCollaborationHeader
      board={currentBoard}
      members={boardMembers}
      access={currentBoardAccess}
      activeCollaborators={activeCollaborators}
      isSharing={isSharingBoard}
      onShare={handleShareBoard}
      onInvite={() => setIsInviteModalOpen(true)}
      onRemoveMember={(email) => removeBoardMember(currentBoardId, email)}
      onLeaveBoard={() => leaveBoard(currentBoardId)}
      shareFeedback={shareFeedback}
    />
  ) : null;

  const renderBoardColumns = () => (
    <>
      {columns.map((column) => (
        <Column key={column.id} column={column} tasks={tasks.filter((task) => task.column_id === column.id)} />
      ))}

      {canEditCurrentBoard ? (
        <div className="w-[280px] shrink-0 sm:w-[320px]">
          {!isAddingColumn ? (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="kb-add-column flex min-h-[72px] w-full items-center gap-3 rounded-[20px] px-4 text-left sm:px-5"
            >
              <div className="rounded-2xl bg-white/80 p-2 text-blue-700 shadow-sm">
                <Plus size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold">Добавить колонку</div>
                <div className="mt-1 text-sm text-slate-500">Новый этап для задач</div>
              </div>
            </button>
          ) : (
            <form onSubmit={handleAddColumn} className="kb-panel rounded-[20px] p-4">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">Новая колонка</label>
              <input
                autoFocus
                value={columnTitle}
                onChange={(event) => setColumnTitle(event.target.value)}
                placeholder="Например, На проверке"
                className="mb-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="submit" className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                  Создать
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setColumnTitle('');
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <InviteCollaboratorModal
        isOpen={isInviteModalOpen}
        boardTitle={currentBoard?.title}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={(email) => inviteBoardMember(currentBoardId, email)}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveItem(null)}
        onDragEnd={handleDragEnd}
      >
        <section
          className={
            shouldRenderSplitPanels
              ? 'flex h-full min-h-0 flex-col overflow-hidden bg-transparent'
              : `kb-board flex h-full min-h-0 flex-col ${showInbox ? 'overflow-visible' : 'overflow-hidden'}`
          }
        >
          {showHeader ? (
            <header className="relative z-[1] border-b border-white/40 bg-white/40 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-3xl">{currentBoard?.title || 'Текущая доска'}</h2>
                </div>
              </div>
            </header>
          ) : null}

          {shouldRenderSplitPanels ? (
            <div className="relative z-[1] flex flex-1 min-h-0 items-stretch gap-4 overflow-hidden px-3 pb-0 pt-1 sm:px-6 sm:pt-2">
              <InboxWorkspace />
              {splitMiddlePanel}
              <BoardWorkspace header={boardHeader}>{renderBoardColumns()}</BoardWorkspace>
            </div>
          ) : inboxOnly ? (
            <div
              className={`custom-scrollbar relative z-[1] flex-1 overflow-auto ${
                inboxExpanded ? 'px-0 pb-0 pt-0' : 'px-3 pb-28 pt-3 sm:px-6 sm:pb-32 sm:pt-5'
              } ${!inboxExpanded ? 'flex items-start justify-center' : ''}`}
            >
              <div className={`items-start ${inboxExpanded ? 'h-full w-full min-w-0' : 'w-full max-w-[760px]'}`}>
                <InboxColumn expanded={inboxExpanded} />
              </div>
            </div>
          ) : (
            <div className="relative z-[1] flex flex-1 min-h-0 overflow-hidden px-3 pb-0 pt-1 sm:px-6 sm:pt-2">
              <BoardWorkspace header={boardHeader}>{renderBoardColumns()}</BoardWorkspace>
            </div>
          )}
        </section>

        <DragOverlay dropAnimation={{ duration: 70, easing: 'linear' }}>
          {activeItem?.type === 'task' ? <TaskCard task={activeItem.data} isOverlay dndId={`task:${activeItem.data.id}`} /> : null}
          {activeItem?.type === 'inbox' ? <InboxIdeaCard idea={activeItem.data} isOverlay dndId={`inbox:${activeItem.data.id}`} /> : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

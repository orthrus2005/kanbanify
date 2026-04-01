import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, ArrowRightLeft, CalendarDays, Inbox, LayoutGrid, LogOut, Plus, Trash2, User2, X } from 'lucide-react';
import { useAuthStore } from './entities/session/model/authStore';
import { useBoardStore } from './entities/board/model/store';
import { KanbanBoard } from './widgets/kanban/ui/KanbanBoard';
import { InboxWorkspace } from './widgets/kanban/ui/InboxWorkspace';
import { PlannerWorkspacePanel } from './widgets/kanban/ui/PlannerWorkspacePanel';
import { PlannerWorkspace } from './widgets/planner/ui/PlannerWorkspace';
import { ArchiveDrawer } from './widgets/archive/ui/ArchiveDrawer';
import { AuthForm } from './features/auth/ui/AuthForm';
import { ConfirmDialog } from './shared/ui/ConfirmDialog';
import { useConfirmStore } from './shared/model/confirmStore';

const WORKSPACE_PANELS_KEY = 'kanbanify-workspace-panels';
const DEFAULT_WORKSPACE_PANELS = { inbox: false, planner: false, board: true };

const parseSharedBoardId = (pathname = '') => pathname.match(/^\/board\/([^/]+)\/?$/)?.[1] || '';

const normalizeWorkspacePanels = (value) => {
  if (typeof value === 'string') {
    if (value === 'inbox') return { inbox: true, planner: false, board: false };
    if (value === 'planner') return { inbox: false, planner: true, board: false };
    if (value === 'board') return { inbox: false, planner: false, board: true };
  }

  const normalized = {
    inbox: Boolean(value?.inbox),
    planner: Boolean(value?.planner),
    board: Boolean(value?.board),
  };

  if (!normalized.inbox && !normalized.planner && !normalized.board) {
    return DEFAULT_WORKSPACE_PANELS;
  }

  return normalized;
};

const dedupeBoards = (items) => Array.from(new Map((items || []).filter(Boolean).map((board) => [board.id, board])).values());

const getActiveWorkspaceLabel = (panels) =>
  [
    panels.inbox ? 'Inbox' : null,
    panels.planner ? 'Планировщик' : null,
    panels.board ? 'Доска' : null,
  ]
    .filter(Boolean)
    .join(' + ');

const WorkspacePlaceholder = ({ title, text, actionLabel, onAction }) => (
  <div className="flex h-full flex-col items-center justify-center px-5 py-12 text-center text-white/88">
    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/14 bg-white/10 shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
      <LayoutGrid className="h-9 w-9" />
    </div>
    <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
    <p className="mt-2 max-w-md text-sm leading-6 text-white/74">{text}</p>
    {onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="mt-5 rounded-2xl border border-white/14 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/14"
      >
        {actionLabel}
      </button>
    ) : null}
  </div>
);

function App() {
  const { user, isLoading: isAuthLoading, checkSession, signOut } = useAuthStore();
  const requestConfirm = useConfirmStore((state) => state.requestConfirm);
  const {
    boards = [],
    publicBoards = [],
    currentBoardId,
    currentBoardRecord,
    currentBoardAccess,
    boardViewError,
    setCurrentBoard,
    createBoard,
    deleteBoard,
    fetchBoards,
    openBoardByShareId,
    isLoading,
  } = useBoardStore();

  const [pathname, setPathname] = useState(() => (typeof window === 'undefined' ? '/' : window.location.pathname));
  const [isBoardPickerOpen, setIsBoardPickerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [workspacePanels, setWorkspacePanels] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_WORKSPACE_PANELS;

    const raw = window.localStorage.getItem(WORKSPACE_PANELS_KEY);
    if (!raw) return DEFAULT_WORKSPACE_PANELS;

    try {
      return normalizeWorkspacePanels(JSON.parse(raw));
    } catch {
      return normalizeWorkspacePanels(raw);
    }
  });

  const userMenuButtonRef = useRef(null);
  const userMenuRef = useRef(null);

  const sharedBoardId = useMemo(() => parseSharedBoardId(pathname), [pathname]);
  const allBoards = useMemo(() => dedupeBoards([...(boards || []), ...(publicBoards || [])]), [boards, publicBoards]);
  const currentBoard = useMemo(() => currentBoardRecord || allBoards.find((board) => board.id === currentBoardId) || null, [allBoards, currentBoardId, currentBoardRecord]);
  const activeWorkspaceLabel = useMemo(() => getActiveWorkspaceLabel(workspacePanels), [workspacePanels]);
  const privateBoards = useMemo(() => dedupeBoards(boards.filter((board) => !board.is_public)), [boards]);
  const visiblePublicBoards = useMemo(
    () => dedupeBoards([...publicBoards, ...boards.filter((board) => board.is_public)]),
    [boards, publicBoards]
  );

  const userMenuStyle = useMemo(() => {
    if (!isUserMenuOpen || !userMenuButtonRef.current || typeof window === 'undefined') return null;

    const rect = userMenuButtonRef.current.getBoundingClientRect();
    const width = 224;
    const safeGap = 16;
    const left = Math.max(safeGap, rect.right - width);

    return {
      position: 'fixed',
      top: `${rect.bottom + 12}px`,
      left: `${left}px`,
      width: `${width}px`,
      zIndex: 12000,
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (sharedBoardId) return;
    if (user) fetchBoards();
  }, [fetchBoards, sharedBoardId, user]);

  useEffect(() => {
    if (!sharedBoardId) return;
    openBoardByShareId(sharedBoardId);
  }, [openBoardByShareId, sharedBoardId, user?.email, user?.id]);

  useEffect(() => {
    window.localStorage.setItem(WORKSPACE_PANELS_KEY, JSON.stringify(workspacePanels));
  }, [workspacePanels]);

  useEffect(() => {
    if (!isBoardPickerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsBoardPickerOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isBoardPickerOpen]);

  useEffect(() => {
    if (!isUserMenuOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };

    const handleOutside = (event) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target) &&
        userMenuButtonRef.current &&
        !userMenuButtonRef.current.contains(event.target)
      ) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isUserMenuOpen]);

  const handleCreateBoard = async () => {
    const title = prompt('Название доски:');
    if (!title?.trim()) return;

    await createBoard(title.trim());
    setIsBoardPickerOpen(false);
  };

  const handleSelectBoard = async (boardId) => {
    await setCurrentBoard(boardId);
    setIsBoardPickerOpen(false);
  };

  const handleDeleteBoard = async (board) => {
    if (!board?.id || !user?.id || board.user_id !== user.id) return;

    const confirmed = await requestConfirm({
      title: 'Удалить доску',
      message: `Доска "${board.title}" будет удалена без возможности восстановления.`,
    });

    if (!confirmed) return;

    await deleteBoard(board.id);
  };

  const toggleWorkspacePanel = (panelKey) => {
    setWorkspacePanels((currentState) => {
      const nextState = { ...currentState, [panelKey]: !currentState[panelKey] };

      if (!nextState.inbox && !nextState.planner && !nextState.board) {
        return currentState;
      }

      return nextState;
    });
  };

  const renderPlannerWindow = (className = '') => (
    <PlannerWorkspacePanel className={className}>
      <PlannerWorkspace />
    </PlannerWorkspacePanel>
  );

  const renderBoardWorkspace = (withInbox = false, splitMiddlePanel = null) => (
    <KanbanBoard showHeader={false} showInbox={withInbox} splitMiddlePanel={splitMiddlePanel} />
  );

  const renderBoardContent = () => {
    if (currentBoardId) {
      return renderBoardWorkspace(false);
    }

    return (
      <WorkspacePlaceholder
        title="Выберите доску"
        text="Откройте другую доску через нижнее меню, чтобы продолжить работу."
        actionLabel="Открыть список досок"
        onAction={() => setIsBoardPickerOpen(true)}
      />
    );
  };

  const activePanelCount = [workspacePanels.inbox, workspacePanels.planner, workspacePanels.board].filter(Boolean).length;

  const renderSingleWorkspace = () => {
    if (workspacePanels.inbox) {
      return <div className="h-full overflow-hidden">{<KanbanBoard showHeader={false} showInbox inboxOnly inboxExpanded />}</div>;
    }

    if (workspacePanels.planner) {
      return renderPlannerWindow('w-full min-w-0');
    }

    if (workspacePanels.board) {
      return renderBoardContent();
    }

    return (
      <WorkspacePlaceholder
        title="Выберите рабочую зону"
        text="Откройте хотя бы одну вкладку через нижнее меню."
      />
    );
  };

  const renderWorkspace = () => {
    if (activePanelCount <= 1) {
      return renderSingleWorkspace();
    }

    const showTripleWorkspace = workspacePanels.inbox && workspacePanels.planner && workspacePanels.board;
    const showCombinedBoardWorkspace = workspacePanels.inbox && workspacePanels.board;
    const stretchedPanelClass = 'h-full self-stretch';

    return (
      <div className="custom-scrollbar flex h-full min-h-0 items-stretch gap-4 overflow-x-auto overflow-y-hidden px-4 pb-0 pt-2 sm:px-6 sm:pt-3">
        {showCombinedBoardWorkspace && showTripleWorkspace ? (
          <section className={`relative z-[5] flex min-h-0 min-w-[1760px] flex-1 overflow-visible ${stretchedPanelClass}`}>
            {renderBoardWorkspace(true, renderPlannerWindow(stretchedPanelClass))}
          </section>
        ) : null}

        {!showCombinedBoardWorkspace && workspacePanels.inbox ? <InboxWorkspace /> : null}
        {workspacePanels.planner && !showTripleWorkspace ? renderPlannerWindow(stretchedPanelClass) : null}

        {showCombinedBoardWorkspace && !showTripleWorkspace ? (
          <section className={`relative z-[5] min-h-0 min-w-[1160px] flex-1 overflow-visible ${stretchedPanelClass}`}>
            {renderBoardWorkspace(true)}
          </section>
        ) : null}

        {!showCombinedBoardWorkspace && workspacePanels.board ? (
          <section className={`min-h-0 min-w-[860px] flex-1 overflow-hidden rounded-[30px] border border-white/12 bg-slate-950/10 ${stretchedPanelClass}`}>
            {renderBoardContent()}
          </section>
        ) : null}
      </div>
    );
  };

  const userMenuMarkup =
    isUserMenuOpen && userMenuStyle && typeof document !== 'undefined'
      ? createPortal(
          <div ref={userMenuRef} style={userMenuStyle} className="rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
            <div className="mb-2 rounded-[18px] bg-slate-50 px-3 py-3">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Профиль</div>
              <div className="mt-1 truncate text-sm font-semibold text-slate-800">{user?.email || 'Пользователь'}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsArchiveOpen(true);
                setIsUserMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <Archive size={16} />
              Архив
            </button>
          </div>,
          document.body
        )
      : null;

  if (isAuthLoading && !user && !sharedBoardId) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">Загрузка...</div>;
  }

  if (!user && !sharedBoardId) {
    return <AuthForm />;
  }

  const boardPickerModal =
    user && isBoardPickerOpen ? (
      <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-slate-950/38 backdrop-blur-sm md:items-center">
        <button type="button" aria-label="Закрыть выбор доски" className="absolute inset-0" onClick={() => setIsBoardPickerOpen(false)} />

        <div className="relative z-[1] flex max-h-[min(78vh,780px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#1b1f26] text-white shadow-[0_36px_100px_rgba(0,0,0,0.46)] md:rounded-[30px]">
          <div className="border-b border-white/8 px-4 py-4 sm:px-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.24em] text-white/62">Workspace</div>
                <div className="text-xl font-black tracking-tight">Выбрать другую доску</div>
              </div>
              <button
                type="button"
                onClick={() => setIsBoardPickerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/8 text-white/88 transition hover:bg-white/12 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-white/38">Мои доски</div>
                <div className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-bold text-white/65">{privateBoards.length}</div>
              </div>

              <div className="space-y-2">
                {isLoading && privateBoards.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/7 px-4 py-4 text-sm text-white/78">Загрузка...</div>
                ) : privateBoards.length ? (
                  privateBoards.map((board) => (
                    <div
                      key={board.id}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                        currentBoardId === board.id
                          ? 'border-blue-400/50 bg-blue-500/16 text-white'
                          : 'border-white/10 bg-white/7 text-white/86 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <button type="button" onClick={() => handleSelectBoard(board.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className={`h-2.5 w-2.5 rounded-full ${currentBoardId === board.id ? 'bg-emerald-400' : 'bg-white/28'}`} />
                        <span className="truncate text-sm font-semibold">{board.title}</span>
                      </button>
                      {board.user_id === user?.id ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteBoard(board);
                          }}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-300/30 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/20 hover:text-white"
                          aria-label={`Удалить доску ${board.title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 px-4 py-5 text-sm text-white/45">
                    Личных и приглашённых досок пока нет.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-white/38">Публичные</div>
                <div className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-bold text-white/65">{visiblePublicBoards.length}</div>
              </div>

              <div className="space-y-2">
                {visiblePublicBoards.length ? (
                  visiblePublicBoards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => handleSelectBoard(board.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        currentBoardId === board.id
                          ? 'border-blue-400/50 bg-blue-500/16 text-white'
                          : 'border-white/10 bg-white/7 text-white/86 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-base">🌍</span>
                      <span className="truncate text-sm font-semibold">{board.title}</span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/4 px-4 py-5 text-sm text-white/45">
                    Публичных досок пока нет.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex border-t border-white/8 bg-white/[0.03] px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={handleCreateBoard}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={16} />
              Создать доску
            </button>
            <button
              type="button"
              onClick={signOut}
              className="hidden"
            >
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </div>
      </div>
    ) : null;

  if (sharedBoardId) {
    return (
      <div className="h-[100dvh] overflow-hidden bg-[#202228] p-0 md:p-3">
        <ConfirmDialog />
        {user ? <ArchiveDrawer isOpen={isArchiveOpen} onClose={() => setIsArchiveOpen(false)} /> : null}
        {userMenuMarkup}

        <div className="kb-shell relative flex h-full min-h-0 w-full flex-col overflow-hidden border border-white/8 shadow-[0_28px_80px_rgba(15,23,42,0.22)] md:rounded-[30px]">
          <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(252,253,255,0.96),rgba(244,247,252,0.94))] px-4 py-4 text-slate-900 backdrop-blur-xl sm:px-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-500 via-blue-600 to-emerald-500 text-white shadow-[0_14px_34px_rgba(37,99,235,0.28)]">
                  <LayoutGrid size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Public board</div>
                  <div className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-[1.35rem]">{currentBoard?.title || 'Загрузка доски...'}</div>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2.5">
                {user ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        window.history.pushState({}, '', '/');
                        setPathname('/');
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-[18px] border border-slate-200 bg-white/88 px-4 text-sm font-semibold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                    >
                      В workspace
                    </button>
                    <button
                      type="button"
                      onClick={signOut}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-slate-200 bg-white/88 text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                      aria-label="Выйти"
                    >
                      <LogOut size={16} />
                    </button>
                    <button
                      ref={userMenuButtonRef}
                      type="button"
                      onClick={() => setIsUserMenuOpen((value) => !value)}
                      className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-orange-500 text-sm font-black text-white shadow-[0_12px_28px_rgba(249,115,22,0.25)] transition hover:brightness-105"
                      aria-label="Открыть меню пользователя"
                    >
                      {user.email?.[0]?.toUpperCase() || <User2 size={16} />}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      window.history.pushState({}, '', '/');
                      setPathname('/');
                    }}
                    className="inline-flex h-11 items-center justify-center rounded-[18px] bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.3)] transition hover:bg-blue-700"
                  >
                    Войти
                  </button>
                )}
              </div>
            </div>
          </div>

          <main className="min-h-0 min-w-0 flex-1 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.04)),linear-gradient(180deg,#66418f_0%,#7b4d99_46%,#885b93_100%)]">
            {isLoading ? (
              <WorkspacePlaceholder title="Загрузка доски" text="Подтягиваем актуальное состояние колонок и задач..." />
            ) : boardViewError === 'not_found' ? (
              <WorkspacePlaceholder title="Доска не найдена" text="Проверьте ссылку или попросите владельца создать новую публичную ссылку." />
            ) : boardViewError === 'forbidden' || !currentBoardAccess.canView ? (
              <WorkspacePlaceholder title="Нет доступа" text="У этой доски нет публичного доступа. Войдите в аккаунт с приглашённым email или попросите открыть доску." />
            ) : (
              <div className="h-full overflow-hidden">
                <KanbanBoard showHeader={false} showInbox={false} />
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[#202228] p-0 md:p-3">
      <ConfirmDialog />
      <ArchiveDrawer isOpen={isArchiveOpen} onClose={() => setIsArchiveOpen(false)} />
      {userMenuMarkup}
      {boardPickerModal}

      <div className="kb-shell relative flex h-full min-h-0 w-full flex-col overflow-hidden border border-white/8 shadow-[0_28px_80px_rgba(15,23,42,0.22)] md:rounded-[30px]">
        <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(252,253,255,0.96),rgba(244,247,252,0.94))] px-4 py-4 text-slate-900 backdrop-blur-xl sm:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-500 via-blue-600 to-emerald-500 text-white shadow-[0_14px_34px_rgba(37,99,235,0.28)]">
                <LayoutGrid size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Workspace</div>
                <div className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-[1.35rem]">Kanbanify</div>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCreateBoard}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.3)] transition hover:bg-blue-700"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Создать</span>
              </button>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-slate-200 bg-white/88 text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                aria-label="Выйти"
              >
                <LogOut size={16} />
              </button>
              <button
                ref={userMenuButtonRef}
                type="button"
                onClick={() => setIsUserMenuOpen((value) => !value)}
                className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-orange-500 text-sm font-black text-white shadow-[0_12px_28px_rgba(249,115,22,0.25)] transition hover:brightness-105"
                aria-label="Открыть меню пользователя"
              >
                {user?.email?.[0]?.toUpperCase() || <User2 size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="border-b border-violet-200/70 bg-[linear-gradient(180deg,rgba(249,245,255,0.96),rgba(239,233,255,0.94))] px-4 py-3 text-slate-900 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.28em] text-violet-500/80">{activeWorkspaceLabel}</div>
              <div className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-[1.7rem]">
                {currentBoard?.title || (workspacePanels.inbox ? 'Глобальный Inbox' : 'Без выбранной доски')}
              </div>
            </div>
          </div>
        </div>

        <main className="min-h-0 min-w-0 flex-1 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.04)),linear-gradient(180deg,#66418f_0%,#7b4d99_46%,#885b93_100%)]">
          {renderWorkspace()}
        </main>

        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[100] flex justify-center px-4">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-[24px] border border-white/12 bg-[#171a20]/96 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
            <button
              type="button"
              onClick={() => toggleWorkspacePanel('inbox')}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                workspacePanels.inbox
                  ? 'bg-blue-500/24 text-blue-100 shadow-[inset_0_0_0_1px_rgba(147,197,253,0.18)]'
                  : 'text-slate-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Inbox size={16} />
              Inbox
            </button>
            <button
              type="button"
              onClick={() => toggleWorkspacePanel('planner')}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                workspacePanels.planner
                  ? 'bg-blue-500/24 text-blue-100 shadow-[inset_0_0_0_1px_rgba(147,197,253,0.18)]'
                  : 'text-slate-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <CalendarDays size={16} />
              Планировщик
            </button>
            <button
              type="button"
              onClick={() => toggleWorkspacePanel('board')}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                workspacePanels.board
                  ? 'bg-blue-500/24 text-blue-100 shadow-[inset_0_0_0_1px_rgba(147,197,253,0.18)]'
                  : 'text-slate-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <LayoutGrid size={16} />
              Доска
            </button>
            <button
              type="button"
              onClick={() => setIsBoardPickerOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowRightLeft size={16} />
              Выбрать другую доску
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

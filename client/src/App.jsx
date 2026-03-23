import React, { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, LogOut, Plus, Search } from 'lucide-react';
import { useAuthStore } from './entities/session/model/authStore';
import { useBoardStore } from './entities/board/model/store';
import { KanbanBoard } from './widgets/kanban/ui/KanbanBoard';
import { AuthForm } from './features/auth/ui/AuthForm';
import { ConfirmDialog } from './shared/ui/ConfirmDialog';

function App() {
  const { user, checkSession, signOut } = useAuthStore();
  const {
    boards = [],
    publicBoards = [],
    currentBoardId,
    setCurrentBoard,
    createBoard,
    fetchBoards,
    isLoading,
  } = useBoardStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (user) fetchBoards();
  }, [user]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredBoards = useMemo(
    () => boards.filter((board) => board.title?.toLowerCase().includes(normalizedSearch)),
    [boards, normalizedSearch]
  );

  const filteredPublicBoards = useMemo(
    () => publicBoards.filter((board) => board.title?.toLowerCase().includes(normalizedSearch)),
    [publicBoards, normalizedSearch]
  );

  if (!user) return <AuthForm />;

  const handleCreateBoard = () => {
    const title = prompt('Название доски:');
    if (title?.trim()) createBoard(title.trim());
  };

  const noSearchResults = normalizedSearch && filteredBoards.length === 0 && filteredPublicBoards.length === 0;

  return (
    <div className="flex min-h-screen bg-transparent p-3 sm:p-4">
      <ConfirmDialog />

      <div className="kb-shell flex min-h-[calc(100vh-24px)] w-full overflow-hidden rounded-[28px] border border-white/60 shadow-[0_30px_80px_rgba(15,23,42,0.12)]">
        <aside className="hidden w-[290px] shrink-0 border-r border-slate-200/70 bg-slate-950/[0.035] lg:flex lg:flex-col">
          <div className="border-b border-slate-200/70 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-500/20">
                <LayoutGrid size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Workspace</p>
                <h1 className="text-xl font-black tracking-tight text-slate-900">Kanbanify</h1>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Поиск по всем доскам"
                className="w-full rounded-2xl border border-slate-200 bg-white/85 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
            <section className="mb-8">
              <div className="mb-3 flex items-center justify-between px-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Мои доски</p>
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{filteredBoards.length}</span>
              </div>

              <div className="space-y-1.5">
                {isLoading && boards.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-slate-400">Загрузка...</p>
                ) : (
                  filteredBoards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => setCurrentBoard(board.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                        currentBoardId === board.id
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                          : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${currentBoardId === board.id ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="truncate text-sm font-semibold">{board.title}</span>
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={handleCreateBoard}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50/70 px-3 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100/80"
              >
                <Plus size={16} />
                Создать доску
              </button>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between px-2">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Публичные</p>
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{filteredPublicBoards.length}</span>
              </div>

              <div className="space-y-1.5">
                {filteredPublicBoards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => setCurrentBoard(board.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all ${
                      currentBoardId === board.id
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-base">🌍</span>
                    <span className="truncate text-sm font-semibold">{board.title}</span>
                  </button>
                ))}
              </div>
            </section>

            {noSearchResults ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-4 py-5 text-sm text-slate-500">
                Ничего не найдено. Попробуйте другой запрос.
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200/70 bg-white/55 p-4">
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200/70">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-bold text-white">
                {user.email?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Аккаунт</p>
                <p className="truncate text-sm font-semibold text-slate-800">{user.email}</p>
              </div>
            </div>

            <button
              onClick={signOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={16} />
              Выйти
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {currentBoardId ? (
            <KanbanBoard />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-400">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-white/70 shadow-lg shadow-slate-200/70 ring-1 ring-white/70">
                <LayoutGrid className="h-9 w-9" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-700">Выберите доску</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Откройте существующую доску слева или создайте новую, чтобы начать раскладывать задачи по колонкам.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

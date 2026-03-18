import React, { useEffect, useState } from 'react';
import { useBoardStore } from './entities/board/model/store';
import { KanbanBoard } from './widgets/kanban/ui/KanbanBoard';

function App() {
  const { initializeBoard, createBoard, currentBoardId, isLoading } = useBoardStore();
  const [newBoardTitle, setNewBoardTitle] = useState('');

  useEffect(() => {
    initializeBoard();
  }, [initializeBoard]);

  const handleCreateBoard = (e) => {
    e.preventDefault();
    if (newBoardTitle.trim()) {
      createBoard(newBoardTitle);
      setNewBoardTitle('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <header className="h-16 border-b bg-white flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-200">
            <div className="w-4 h-4 border-2 border-white rounded-sm" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Kanbanify</h1>
        </div>
        
        {isLoading && (
          <span className="text-xs text-red-500 animate-pulse font-bold tracking-widest uppercase">
            Синхронизация...
          </span>
        )}
      </header>

      <main className="flex-1 overflow-hidden">
        {currentBoardId ? (
          <KanbanBoard boardId={currentBoardId} />
        ) : !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full animate-in fade-in zoom-in duration-500">
            <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
              <h2 className="text-2xl font-bold text-center mb-6">Создать новую доску</h2>
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название проекта</label>
                  <input
                    type="text"
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                    placeholder="Например: Разработка приложения"
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newBoardTitle.trim()}
                  className="w-full py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-200"
                >
                  Начать работу
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default App;
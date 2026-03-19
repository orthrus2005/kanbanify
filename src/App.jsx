import React, { useEffect } from 'react';
import { useAuthStore } from './entities/session/model/authStore';
import { useBoardStore } from './entities/board/model/store';
import { KanbanBoard } from './widgets/kanban/ui/KanbanBoard';
import { AuthForm } from './features/auth/ui/AuthForm';
import { ConfirmDialog } from './shared/ui/ConfirmDialog';

function App() {
  const { user, checkSession, signOut } = useAuthStore();
  const { 
    boards = [], // Значение по умолчанию
    publicBoards = [], 
    currentBoardId, 
    setCurrentBoard, 
    createBoard, 
    fetchBoards,
    isLoading 
  } = useBoardStore();

  useEffect(() => { checkSession(); }, []);
  useEffect(() => { if (user) fetchBoards(); }, [user]);

  if (!user) return <AuthForm />;

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <ConfirmDialog />
      <aside className="w-64 bg-white border-r flex flex-col shadow-xl z-20">
        <div className="p-6 border-b flex items-center gap-2 font-black text-red-500 uppercase tracking-tighter text-xl">
           <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-white text-[10px]">K</div>
           Kanbanify
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Мои доски</p>
            {isLoading && boards.length === 0 ? (
              <p className="px-2 text-xs text-gray-400">Загрузка...</p>
            ) : (
              boards?.map(b => (
                <button 
                  key={b.id} 
                  onClick={() => setCurrentBoard(b.id)} 
                  className={`w-full text-left p-2 rounded-xl mb-1 text-sm font-semibold truncate transition-all ${currentBoardId === b.id ? 'bg-red-50 text-red-600 shadow-sm' : 'hover:bg-gray-50'}`}
                >
                  {b.title}
                </button>
              ))
            )}
            <button onClick={() => { const t = prompt("Имя доски:"); if(t) createBoard(t); }} className="w-full text-left p-2 text-red-400 text-sm font-bold hover:underline">+ Создать</button>
          </section>

          <section>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">Публичные (Общие)</p>
            {publicBoards?.map(b => (
              <button 
                key={b.id} 
                onClick={() => setCurrentBoard(b.id)} 
                className={`w-full text-left p-2 rounded-xl mb-1 text-sm font-semibold truncate ${currentBoardId === b.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
              >
                🌍 {b.title}
              </button>
            ))}
          </section>
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-orange-400 flex items-center justify-center text-white font-bold text-xs">
               {user.email?.[0].toUpperCase()}
             </div>
             <p className="text-[10px] text-gray-500 font-medium truncate flex-1">{user.email}</p>
          </div>
          <button onClick={signOut} className="w-full py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all">Выйти</button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-auto custom-scrollbar bg-[#fdfdfd]">
        {currentBoardId ? (
          <KanbanBoard />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="font-black uppercase tracking-widest text-sm">Выберите или создайте доску</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
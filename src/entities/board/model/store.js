import { create } from 'zustand';
import { supabase } from '../../../shared/api/supabase';

export const useBoardStore = create((set, get) => ({
  boards: [],
  currentBoardId: null,
  columns: [],
  tasks: [],
  isLoading: false,

  initializeBoard: async () => {
    set({ isLoading: true });
    try {
      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select('*');
      if (boardsError) throw boardsError;

      if (boards && boards.length > 0) {
        const lastBoard = boards[boards.length - 1];
        set({ boards, currentBoardId: lastBoard.id });
        await get().fetchBoardData(lastBoard.id);
      }
    } catch (e) {
      console.error("Ошибка инициализации:", e.message);
    } finally {
      set({ isLoading: false });
    }
  },

  addColumn: async (boardId, title) => {
    if (!boardId) return console.error("Ошибка: boardId не определен");
    
    console.log("Отправка запроса на создание колонки...", { boardId, title });

    const { data, error } = await supabase
      .from('columns')
      .insert([{ 
        board_id: boardId, 
        title: title.trim() 
      }])
      .select();

    if (error) {
      console.error("Supabase Error:", error.message, error.details);
    } else if (data && data.length > 0) {
      console.log("Колонка успешно создана:", data[0]);
      set((state) => ({ columns: [...state.columns, data[0]] }));
    }
  },

  fetchBoardData: async (boardId) => {
    const { data: columns } = await supabase.from('columns').select('*').eq('board_id', boardId);
    if (columns) {
      const { data: tasks } = await supabase.from('tasks').select('*').in('column_id', columns.map(c => c.id));
      set({ columns, tasks: tasks || [], isLoading: false });
    }
  },

  addTask: async (columnId, title) => {
    const { data, error } = await supabase.from('tasks').insert([{ column_id: columnId, title }]).select();
    if (!error && data) set((state) => ({ tasks: [...state.tasks, data[0]] }));
  },

  moveTask: async (taskId, newColumnId) => {
    set((state) => ({
      tasks: state.tasks.map(t => t.id === taskId ? { ...t, column_id: newColumnId } : t)
    }));
    await supabase.from('tasks').update({ column_id: newColumnId }).eq('id', taskId);
  }
}));
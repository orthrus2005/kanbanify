import { create } from 'zustand';
import { supabase } from '../../../shared/api/supabase';

export const useBoardStore = create((set, get) => ({
  boards: [],
  publicBoards: [],
  currentBoardId: null,
  columns: [],
  tasks: [],
  isLoading: false,

  fetchBoards: async () => {
    set({ isLoading: true });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ boards: [], publicBoards: [], currentBoardId: null, columns: [], tasks: [], isLoading: false });
        return;
      }

      const [{ data: myBoards }, { data: pubBoards }] = await Promise.all([
        supabase.from('boards').select('*').eq('user_id', user.id),
        supabase.from('boards').select('*').eq('is_public', true),
      ]);

      const nextBoards = myBoards || [];
      const nextPublicBoards = pubBoards || [];

      // Keep current board if still exists, otherwise choose the first available.
      const currentStillExists =
        (nextBoards.some((b) => b.id === get().currentBoardId) ||
          nextPublicBoards.some((b) => b.id === get().currentBoardId)) &&
        !!get().currentBoardId;

      const nextCurrentBoardId = currentStillExists
        ? get().currentBoardId
        : nextBoards[0]?.id ?? nextPublicBoards[0]?.id ?? null;

      set({
        boards: nextBoards,
        publicBoards: nextPublicBoards,
        currentBoardId: nextCurrentBoardId,
        columns: nextCurrentBoardId ? get().columns : [],
        tasks: nextCurrentBoardId ? get().tasks : [],
      });

      if (nextCurrentBoardId) {
        await get().setCurrentBoard(nextCurrentBoardId);
      } else {
        set({ columns: [], tasks: [] });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentBoard: async (boardId) => {
    set({ currentBoardId: boardId, isLoading: true });
    const { data: cols } = await supabase.from('columns').select('*').eq('board_id', boardId).order('created_at');
    if (cols?.length > 0) {
      const { data: tsks } = await supabase.from('tasks').select('*').in('column_id', cols.map(c => c.id)).eq('is_archived', false);
      set({ columns: cols, tasks: tsks || [] });
    } else {
      set({ columns: [], tasks: [] });
    }
    set({ isLoading: false });
  },

  createBoard: async (title, isPublic = false) => {
    set({ isLoading: true });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: board, error } = await supabase
        .from('boards')
        .insert([{ title, user_id: user.id, is_public: isPublic }])
        .select()
        .single();

      if (error) throw error;
      if (!board) return;

      // Default columns
      await supabase.from('columns').insert([
        { board_id: board.id, title: 'Нужно сделать', user_id: user.id },
        { board_id: board.id, title: 'В работе', user_id: user.id },
      ]);

      // Refresh and open the board.
      set((s) => ({
        boards: isPublic ? s.boards : [...s.boards, board],
        publicBoards: isPublic ? [...s.publicBoards, board] : s.publicBoards,
        currentBoardId: board.id,
      }));
      await get().setCurrentBoard(board.id);
    } finally {
      set({ isLoading: false });
    }
  },

  // --- МЕТОДЫ ДЛЯ КОЛОНОК ---
  addColumn: async (boardId, title) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: newCol, error } = await supabase
      .from('columns')
      .insert([{ board_id: boardId, title, user_id: user.id }])
      .select().single();
    
    if (!error) set(s => ({ columns: [...s.columns, newCol] }));
  },

  deleteColumn: async (columnId) => {
    const { error } = await supabase.from('columns').delete().eq('id', columnId);
    if (!error) set(s => ({ 
      columns: s.columns.filter(c => c.id !== columnId),
      tasks: s.tasks.filter(t => t.column_id !== columnId) 
    }));
  },

  // --- МЕТОДЫ ДЛЯ ЗАДАЧ ---
  addTask: async (columnId, title) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: newTask } = await supabase
      .from('tasks')
      .insert([{ column_id: columnId, title, user_id: user.id }])
      .select().single();
    if (newTask) set(s => ({ tasks: [...s.tasks, newTask] }));
  },

  updateTask: async (id, updates) => {
    const { data } = await supabase.from('tasks').update(updates).eq('id', id).select().single();
    if (data) set(s => ({ tasks: s.tasks.map(t => t.id === id ? data : t) }));
  },

  moveTask: async (id, newColId) => {
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, column_id: newColId } : t) }));
    await supabase.from('tasks').update({ column_id: newColId }).eq('id', id);
  },

  archiveTask: async (id) => {
    await supabase.from('tasks').update({ is_archived: true }).eq('id', id);
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }));
  },

  deleteTask: async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }));
  }
}));
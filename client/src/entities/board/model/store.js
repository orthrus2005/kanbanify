import { create } from 'zustand';
import { supabase } from '../../../shared/api/supabase';
import { useAuthStore } from '../../session/model/authStore';

const getInboxStorageKey = (userId) => `kanbanify-global-inbox-${userId || 'guest'}`;

const readInboxState = (userId) => {
  if (typeof window === 'undefined') {
    return { inboxIdeas: [], archivedInboxIdeas: [] };
  }

  try {
    const raw = window.localStorage.getItem(getInboxStorageKey(userId));
    if (!raw) return { inboxIdeas: [], archivedInboxIdeas: [] };
    const parsed = JSON.parse(raw);
    return {
      inboxIdeas: Array.isArray(parsed?.inboxIdeas) ? parsed.inboxIdeas : [],
      archivedInboxIdeas: Array.isArray(parsed?.archivedInboxIdeas) ? parsed.archivedInboxIdeas : [],
    };
  } catch {
    return { inboxIdeas: [], archivedInboxIdeas: [] };
  }
};

const writeInboxState = (userId, inboxIdeas, archivedInboxIdeas) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getInboxStorageKey(userId), JSON.stringify({ inboxIdeas, archivedInboxIdeas }));
};

const nextIdeaId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `idea-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getCurrentInboxUserId = () => useAuthStore.getState().user?.id || 'guest';

export const useBoardStore = create((set, get) => ({
  boards: [],
  publicBoards: [],
  currentBoardId: null,
  columns: [],
  tasks: [],
  archivedTasks: [],
  inboxIdeas: [],
  archivedInboxIdeas: [],
  isLoading: false,

  loadInboxIdeas: () => {
    const { inboxIdeas, archivedInboxIdeas } = readInboxState(getCurrentInboxUserId());
    set({ inboxIdeas, archivedInboxIdeas });
    return { inboxIdeas, archivedInboxIdeas };
  },

  fetchBoards: async () => {
    set({ isLoading: true });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({
          boards: [],
          publicBoards: [],
          currentBoardId: null,
          columns: [],
          tasks: [],
          archivedTasks: [],
          inboxIdeas: [],
          archivedInboxIdeas: [],
          isLoading: false,
        });
        return;
      }

      const [{ data: myBoards }, { data: pubBoards }] = await Promise.all([
        supabase.from('boards').select('*').eq('user_id', user.id),
        supabase.from('boards').select('*').eq('is_public', true),
      ]);

      const nextBoards = myBoards || [];
      const nextPublicBoards = pubBoards || [];

      const currentStillExists =
        (nextBoards.some((board) => board.id === get().currentBoardId) ||
          nextPublicBoards.some((board) => board.id === get().currentBoardId)) &&
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
        set({ columns: [], tasks: [], archivedTasks: [], inboxIdeas: [], archivedInboxIdeas: [] });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentBoard: async (boardId) => {
    set({ currentBoardId: boardId, isLoading: true, archivedTasks: [] });
    const { data: cols } = await supabase.from('columns').select('*').eq('board_id', boardId).order('created_at');

    if (cols?.length > 0) {
      const { data: tsks } = await supabase
        .from('tasks')
        .select('*')
        .in('column_id', cols.map((column) => column.id))
        .eq('is_archived', false);

      set({ columns: cols, tasks: tsks || [] });
    } else {
      set({ columns: [], tasks: [] });
    }

    get().loadInboxIdeas();
    set({ isLoading: false });
  },

  fetchArchivedTasks: async (boardId) => {
    const boardColumns = get().columns.length
      ? get().columns
      : (await supabase.from('columns').select('*').eq('board_id', boardId).order('created_at')).data || [];

    if (!boardColumns.length) {
      set({ archivedTasks: [] });
      return [];
    }

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .in('column_id', boardColumns.map((column) => column.id))
      .eq('is_archived', true);

    const nextArchivedTasks = data || [];
    set({ archivedTasks: nextArchivedTasks });
    return nextArchivedTasks;
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

      await supabase.from('columns').insert([
        { board_id: board.id, title: 'Нужно сделать', user_id: user.id },
        { board_id: board.id, title: 'В работе', user_id: user.id },
      ]);

      set((state) => ({
        boards: isPublic ? state.boards : [...state.boards, board],
        publicBoards: isPublic ? [...state.publicBoards, board] : state.publicBoards,
        currentBoardId: board.id,
      }));

      await get().setCurrentBoard(board.id);
    } finally {
      set({ isLoading: false });
    }
  },

  addColumn: async (boardId, title) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: newColumn, error } = await supabase
      .from('columns')
      .insert([{ board_id: boardId, title, user_id: user.id }])
      .select()
      .single();

    if (!error) {
      set((state) => ({ columns: [...state.columns, newColumn] }));
    }
  },

  updateColumnTitle: async (columnId, title) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return null;

    const { data, error } = await supabase.from('columns').update({ title: trimmedTitle }).eq('id', columnId).select().single();

    if (error || !data) return null;

    set((state) => ({
      columns: state.columns.map((column) => (column.id === columnId ? data : column)),
    }));

    return data;
  },

  deleteColumn: async (columnId) => {
    const { error } = await supabase.from('columns').delete().eq('id', columnId);

    if (!error) {
      set((state) => ({
        columns: state.columns.filter((column) => column.id !== columnId),
        tasks: state.tasks.filter((task) => task.column_id !== columnId),
        archivedTasks: state.archivedTasks.filter((task) => task.column_id !== columnId),
      }));
    }
  },

  addTask: async (columnId, title) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: newTask } = await supabase
      .from('tasks')
      .insert([{ column_id: columnId, title, user_id: user.id }])
      .select()
      .single();

    if (newTask) {
      set((state) => ({ tasks: [...state.tasks, newTask] }));
    }
  },

  addInboxIdea: (title) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const newIdea = {
      id: nextIdeaId(),
      title: trimmedTitle,
      description: '',
      due_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_archived: false,
    };

    set((state) => {
      const inboxIdeas = [newIdea, ...state.inboxIdeas];
      writeInboxState(getCurrentInboxUserId(), inboxIdeas, state.archivedInboxIdeas);
      return { inboxIdeas };
    });
  },

  updateInboxIdea: (id, updates) => {
    set((state) => {
      const inboxIdeas = state.inboxIdeas.map((idea) =>
        idea.id === id ? { ...idea, ...updates, updated_at: new Date().toISOString() } : idea
      );
      const archivedInboxIdeas = state.archivedInboxIdeas.map((idea) =>
        idea.id === id ? { ...idea, ...updates, updated_at: new Date().toISOString() } : idea
      );
      writeInboxState(getCurrentInboxUserId(), inboxIdeas, archivedInboxIdeas);
      return { inboxIdeas, archivedInboxIdeas };
    });
  },

  archiveInboxIdea: (id) => {
    set((state) => {
      const targetIdea = state.inboxIdeas.find((idea) => idea.id === id);
      if (!targetIdea) return state;
      const inboxIdeas = state.inboxIdeas.filter((idea) => idea.id !== id);
      const archivedInboxIdeas = [{ ...targetIdea, is_archived: true, updated_at: new Date().toISOString() }, ...state.archivedInboxIdeas];
      writeInboxState(getCurrentInboxUserId(), inboxIdeas, archivedInboxIdeas);
      return { inboxIdeas, archivedInboxIdeas };
    });
  },

  unarchiveInboxIdea: (id) => {
    set((state) => {
      const targetIdea = state.archivedInboxIdeas.find((idea) => idea.id === id);
      if (!targetIdea) return state;
      const archivedInboxIdeas = state.archivedInboxIdeas.filter((idea) => idea.id !== id);
      const inboxIdeas = [{ ...targetIdea, is_archived: false, updated_at: new Date().toISOString() }, ...state.inboxIdeas];
      writeInboxState(getCurrentInboxUserId(), inboxIdeas, archivedInboxIdeas);
      return { inboxIdeas, archivedInboxIdeas };
    });
  },

  deleteInboxIdea: (id) => {
    set((state) => {
      const inboxIdeas = state.inboxIdeas.filter((idea) => idea.id !== id);
      const archivedInboxIdeas = state.archivedInboxIdeas.filter((idea) => idea.id !== id);
      writeInboxState(getCurrentInboxUserId(), inboxIdeas, archivedInboxIdeas);
      return { inboxIdeas, archivedInboxIdeas };
    });
  },

  moveTaskToInbox: async (taskId) => {
    const task = get().tasks.find((item) => item.id === taskId);
    if (!task) return;

    await supabase.from('tasks').delete().eq('id', taskId);

    set((state) => {
      const inboxIdeas = [
        {
          id: nextIdeaId(),
          title: task.title,
          description: task.description || '',
          due_date: task.due_date || null,
          created_at: task.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_archived: false,
        },
        ...state.inboxIdeas,
      ];

      writeInboxState(getCurrentInboxUserId(), inboxIdeas, state.archivedInboxIdeas);

      return {
        tasks: state.tasks.filter((item) => item.id !== taskId),
        archivedTasks: state.archivedTasks.filter((item) => item.id !== taskId),
        inboxIdeas,
      };
    });
  },

  moveInboxIdeaToColumn: async (ideaId, columnId) => {
    const idea = get().inboxIdeas.find((item) => item.id === ideaId);
    if (!idea) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: newTask } = await supabase
      .from('tasks')
      .insert([
        {
          column_id: columnId,
          title: idea.title,
          description: idea.description || '',
          due_date: idea.due_date || null,
          user_id: user?.id || null,
        },
      ])
      .select()
      .single();

    if (!newTask) return;

    set((state) => {
      const inboxIdeas = state.inboxIdeas.filter((item) => item.id !== ideaId);
      writeInboxState(getCurrentInboxUserId(), inboxIdeas, state.archivedInboxIdeas);
      return {
        inboxIdeas,
        tasks: [...state.tasks, newTask],
      };
    });
  },

  updateTask: async (id, updates) => {
    const { data } = await supabase.from('tasks').update(updates).eq('id', id).select().single();

    if (data) {
      set((state) => ({
        tasks: state.tasks.map((task) => (task.id === id ? data : task)),
        archivedTasks: state.archivedTasks.map((task) => (task.id === id ? data : task)),
      }));
    }
  },

  moveTask: async (id, newColumnId) => {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, column_id: newColumnId } : task)),
      archivedTasks: state.archivedTasks.map((task) => (task.id === id ? { ...task, column_id: newColumnId } : task)),
    }));

    await supabase.from('tasks').update({ column_id: newColumnId }).eq('id', id);
  },

  archiveTask: async (id) => {
    const currentTask = get().tasks.find((task) => task.id === id);
    await supabase.from('tasks').update({ is_archived: true }).eq('id', id);

    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      archivedTasks: currentTask ? [...state.archivedTasks, { ...currentTask, is_archived: true }] : state.archivedTasks,
    }));
  },

  unarchiveTask: async (id) => {
    const archivedTask = get().archivedTasks.find((task) => task.id === id);
    await supabase.from('tasks').update({ is_archived: false }).eq('id', id);

    set((state) => ({
      archivedTasks: state.archivedTasks.filter((task) => task.id !== id),
      tasks: archivedTask ? [...state.tasks, { ...archivedTask, is_archived: false }] : state.tasks,
    }));
  },

  deleteTask: async (id) => {
    await supabase.from('tasks').delete().eq('id', id);

    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      archivedTasks: state.archivedTasks.filter((task) => task.id !== id),
    }));
  },
}));

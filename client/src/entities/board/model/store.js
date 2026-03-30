import { create } from 'zustand';
import { supabase } from '../../../shared/api/supabase';
import { useAuthStore } from '../../session/model/authStore';

const LEGACY_INBOX_STORAGE_KEY = (userId) => `kanbanify-global-inbox-${userId || 'guest'}`;
const INBOX_ATTACHMENT_BUCKET = 'inbox-attachments';
const ARCHIVED_CARD_TYPE = {
  TASK: 'task',
  INBOX: 'inbox',
};

const readLegacyInboxState = (userId) => {
  if (typeof window === 'undefined') {
    return { inboxIdeas: [], archivedInboxIdeas: [] };
  }

  try {
    const raw = window.localStorage.getItem(LEGACY_INBOX_STORAGE_KEY(userId));
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

const clearLegacyInboxState = (userId) => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LEGACY_INBOX_STORAGE_KEY(userId));
};

const normalizeInboxItem = (item, labels = [], meta = {}) => ({
  ...item,
  description: item.description || '',
  color: item.color || null,
  due_date: item.due_date || null,
  labels,
  comments_count: meta.commentsCount || 0,
  attachments_count: meta.attachmentsCount || 0,
});

const sanitizeFileName = (fileName) => fileName.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-');

const getPositionSeed = (index = 0) => Number(Date.now()) - index;

const isMissingTasksColorError = (error) => {
  if (!error) return false;

  const errorText = `${error.code || ''} ${error.message || ''} ${error.details || ''} ${error.hint || ''}`.toLowerCase();
  return errorText.includes('color') && errorText.includes('task');
};

const withoutColorField = (payload) => {
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'color')) return payload;
  const { color, ...rest } = payload;
  return rest;
};

const insertTaskRecord = async (payload) => {
  const result = await supabase.from('tasks').insert([payload]).select().single();

  if (!result.error || !Object.prototype.hasOwnProperty.call(payload, 'color') || !isMissingTasksColorError(result.error)) {
    return result;
  }

  return supabase.from('tasks').insert([withoutColorField(payload)]).select().single();
};

const updateTaskRecord = async (id, updates) => {
  const result = await supabase.from('tasks').update(updates).eq('id', id).select().single();

  if (!result.error || !Object.prototype.hasOwnProperty.call(updates, 'color') || !isMissingTasksColorError(result.error)) {
    return result;
  }

  return supabase.from('tasks').update(withoutColorField(updates)).eq('id', id).select().single();
};

const getAuthenticatedUser = async () => {
  const authUser = useAuthStore.getState().user;
  if (authUser?.id) return authUser;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
};

const maybeMigrateLegacyInbox = async (userId) => {
  const legacyState = readLegacyInboxState(userId);
  const legacyIdeas = [...legacyState.inboxIdeas, ...legacyState.archivedInboxIdeas];

  if (!legacyIdeas.length) return false;

  const { count, error: countError } = await supabase
    .from('inbox_items')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', userId);

  if (countError || Number(count) > 0) return false;

  const payload = [
    ...legacyState.inboxIdeas.map((idea, index) => ({
      user_id: userId,
      title: idea.title?.trim() || 'Без названия',
      description: idea.description || '',
      due_date: idea.due_date || null,
      position: Number(idea.position ?? getPositionSeed(index)),
      color: idea.color || null,
      is_archived: false,
      created_at: idea.created_at || new Date().toISOString(),
      updated_at: idea.updated_at || idea.created_at || new Date().toISOString(),
    })),
    ...legacyState.archivedInboxIdeas.map((idea, index) => ({
      user_id: userId,
      title: idea.title?.trim() || 'Без названия',
      description: idea.description || '',
      due_date: idea.due_date || null,
      position: Number(idea.position ?? getPositionSeed(index + legacyState.inboxIdeas.length)),
      color: idea.color || null,
      is_archived: true,
      created_at: idea.created_at || new Date().toISOString(),
      updated_at: idea.updated_at || idea.created_at || new Date().toISOString(),
    })),
  ];

  const { error } = await supabase.from('inbox_items').insert(payload);
  if (error) return false;

  clearLegacyInboxState(userId);
  return true;
};

const fetchInboxLabelsFromDb = async (userId) => {
  const { data, error } = await supabase
    .from('inbox_labels')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
};

const fetchInboxIdeasFromDb = async (userId) => {
  await maybeMigrateLegacyInbox(userId);

  const [itemsResult, labelsResult] = await Promise.all([
    supabase
      .from('inbox_items')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: false })
      .order('created_at', { ascending: false }),
    fetchInboxLabelsFromDb(userId),
  ]);

  if (itemsResult.error) {
    return { inboxIdeas: [], archivedInboxIdeas: [], inboxLabels: labelsResult };
  }

  const rows = itemsResult.data || [];
  const inboxLabels = labelsResult;
  const labelMap = new Map(inboxLabels.map((label) => [label.id, label]));

  let labelsByItemId = new Map();

  if (rows.length > 0) {
    const itemIds = rows.map((row) => row.id);
    const [{ data: itemLabels }, { data: comments }, { data: attachments }] = await Promise.all([
      supabase.from('inbox_item_labels').select('inbox_item_id, label_id').in('inbox_item_id', itemIds),
      supabase.from('inbox_comments').select('id, inbox_item_id').in('inbox_item_id', itemIds),
      supabase.from('inbox_attachments').select('id, inbox_item_id').in('inbox_item_id', itemIds),
    ]);

    labelsByItemId = (itemLabels || []).reduce((acc, row) => {
      const nextLabels = acc.get(row.inbox_item_id) || [];
      const label = labelMap.get(row.label_id);
      if (label) nextLabels.push(label);
      acc.set(row.inbox_item_id, nextLabels);
      return acc;
    }, new Map());

    const commentsCountByItemId = (comments || []).reduce((acc, row) => {
      acc.set(row.inbox_item_id, (acc.get(row.inbox_item_id) || 0) + 1);
      return acc;
    }, new Map());

    const attachmentsCountByItemId = (attachments || []).reduce((acc, row) => {
      acc.set(row.inbox_item_id, (acc.get(row.inbox_item_id) || 0) + 1);
      return acc;
    }, new Map());

    const normalizedRows = rows.map((item) =>
      normalizeInboxItem(item, labelsByItemId.get(item.id) || [], {
        commentsCount: commentsCountByItemId.get(item.id) || 0,
        attachmentsCount: attachmentsCountByItemId.get(item.id) || 0,
      })
    );

    return {
      inboxIdeas: normalizedRows.filter((item) => !item.is_archived),
      archivedInboxIdeas: normalizedRows.filter((item) => item.is_archived),
      inboxLabels,
    };
  }

  const normalizedRows = rows.map((item) => normalizeInboxItem(item, labelsByItemId.get(item.id) || []));

  return {
    inboxIdeas: normalizedRows.filter((item) => !item.is_archived),
    archivedInboxIdeas: normalizedRows.filter((item) => item.is_archived),
    inboxLabels,
  };
};

const createAttachmentUrl = async (filePath) => {
  if (!filePath) return null;

  const { data, error } = await supabase.storage.from(INBOX_ATTACHMENT_BUCKET).createSignedUrl(filePath, 60 * 60);
  if (error) return null;
  return data?.signedUrl || null;
};

const upsertArchivedCard = async (payload) =>
  supabase
    .from('archived_cards')
    .upsert([payload], { onConflict: 'item_type,source_id' })
    .select()
    .single();

const deleteArchivedCard = async (itemType, sourceId) =>
  supabase.from('archived_cards').delete().eq('item_type', itemType).eq('source_id', sourceId);

const toArchivedTaskRecord = (item) => ({
  id: item.source_id,
  title: item.title,
  description: item.description || '',
  due_date: item.due_date || null,
  color: item.color || null,
  column_id: item.column_id || null,
  board_id: item.board_id || null,
  is_archived: true,
  archived_at: item.archived_at,
  created_at: item.created_at || item.archived_at,
});

const toArchivedCardItem = (item) => ({
  id: item.id,
  source_id: item.source_id,
  item_type: item.item_type,
  title: item.title,
  description: item.description || '',
  due_date: item.due_date || null,
  color: item.color || null,
  board_id: item.board_id || null,
  column_id: item.column_id || null,
  archived_at: item.archived_at,
  created_at: item.created_at || item.archived_at,
});

export const useBoardStore = create((set, get) => ({
  boards: [],
  publicBoards: [],
  currentBoardId: null,
  columns: [],
  tasks: [],
  archivedTasks: [],
  archivedCards: [],
  inboxIdeas: [],
  archivedInboxIdeas: [],
  inboxLabels: [],
  isLoading: false,

  loadInboxIdeas: async () => {
    const user = await getAuthenticatedUser();

    if (!user?.id) {
      const emptyState = { inboxIdeas: [], archivedInboxIdeas: [], inboxLabels: [] };
      set(emptyState);
      return emptyState;
    }

    const nextState = await fetchInboxIdeasFromDb(user.id);
    set(nextState);
    return nextState;
  },

  fetchInboxLabels: async () => {
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      set({ inboxLabels: [] });
      return [];
    }

    const inboxLabels = await fetchInboxLabelsFromDb(user.id);
    set({ inboxLabels });
    return inboxLabels;
  },

  createInboxLabel: async (name, color) => {
    const user = await getAuthenticatedUser();
    const trimmedName = name.trim();

    if (!user?.id || !trimmedName) return null;

    const { data, error } = await supabase
      .from('inbox_labels')
      .insert([{ user_id: user.id, name: trimmedName, color: color || null }])
      .select()
      .single();

    if (error || !data) return null;

    set((state) => ({ inboxLabels: [...state.inboxLabels, data] }));
    return data;
  },

  setInboxItemLabels: async (itemId, nextLabelIds) => {
    const { data: currentRows, error: fetchError } = await supabase
      .from('inbox_item_labels')
      .select('label_id')
      .eq('inbox_item_id', itemId);

    if (fetchError) return null;

    const currentLabelIds = (currentRows || []).map((row) => row.label_id);
    const toInsert = nextLabelIds.filter((labelId) => !currentLabelIds.includes(labelId));
    const toDelete = currentLabelIds.filter((labelId) => !nextLabelIds.includes(labelId));

    if (toInsert.length > 0) {
      const payload = toInsert.map((labelId) => ({
        inbox_item_id: itemId,
        label_id: labelId,
      }));

      const { error } = await supabase.from('inbox_item_labels').insert(payload);
      if (error) return null;
    }

    if (toDelete.length > 0) {
      const { error } = await supabase.from('inbox_item_labels').delete().eq('inbox_item_id', itemId).in('label_id', toDelete);
      if (error) return null;
    }

    await get().loadInboxIdeas();
    const idea = [...get().inboxIdeas, ...get().archivedInboxIdeas].find((item) => item.id === itemId);
    return idea?.labels || [];
  },

  fetchInboxComments: async (itemId) => {
    const { data, error } = await supabase
      .from('inbox_comments')
      .select('*')
      .eq('inbox_item_id', itemId)
      .order('created_at', { ascending: true });

    if (error) return [];
    return data || [];
  },

  addInboxComment: async (itemId, body) => {
    const user = await getAuthenticatedUser();
    const trimmedBody = body.trim();

    if (!user?.id || !trimmedBody) return null;

    const { data, error } = await supabase
      .from('inbox_comments')
      .insert([{ inbox_item_id: itemId, user_id: user.id, body: trimmedBody }])
      .select()
      .single();

    if (error) return null;
    return data;
  },

  deleteInboxComment: async (commentId) => {
    const { error } = await supabase.from('inbox_comments').delete().eq('id', commentId);
    return !error;
  },

  fetchInboxAttachments: async (itemId) => {
    const { data, error } = await supabase
      .from('inbox_attachments')
      .select('*')
      .eq('inbox_item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) return [];

    const attachments = await Promise.all(
      (data || []).map(async (attachment) => ({
        ...attachment,
        url: attachment.public_url || (await createAttachmentUrl(attachment.file_path)),
      }))
    );

    return attachments;
  },

  uploadInboxAttachment: async (itemId, file) => {
    const user = await getAuthenticatedUser();
    if (!user?.id || !file) return null;

    const filePath = `${user.id}/${itemId}/${Date.now()}-${sanitizeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage.from(INBOX_ATTACHMENT_BUCKET).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (uploadError) return null;

    const { data, error } = await supabase
      .from('inbox_attachments')
      .insert([
        {
          inbox_item_id: itemId,
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          mime_type: file.type || null,
          file_size: file.size || null,
          public_url: null,
        },
      ])
      .select()
      .single();

    if (error || !data) return null;

    return {
      ...data,
      url: await createAttachmentUrl(filePath),
    };
  },

  deleteInboxAttachment: async (attachmentId) => {
    const { data: attachment, error: fetchError } = await supabase
      .from('inbox_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (fetchError || !attachment) return false;

    if (attachment.file_path) {
      await supabase.storage.from(INBOX_ATTACHMENT_BUCKET).remove([attachment.file_path]);
    }

    const { error } = await supabase.from('inbox_attachments').delete().eq('id', attachmentId);
    return !error;
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
          inboxLabels: [],
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
      });

      if (nextCurrentBoardId) {
        await get().setCurrentBoard(nextCurrentBoardId);
      } else {
        await get().loadInboxIdeas();
        set({ columns: [], tasks: [], archivedTasks: [] });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  setCurrentBoard: async (boardId) => {
    set({ currentBoardId: boardId, isLoading: true, archivedTasks: [] });

    try {
      const inboxPromise = get().loadInboxIdeas();
      const archivedPromise = get().fetchArchivedTasks(boardId);
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

      await Promise.all([inboxPromise, archivedPromise]);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchArchivedTasks: async (boardId) => {
    if (!boardId) {
      set({ archivedTasks: [] });
      return [];
    }

    const { data, error } = await supabase
      .from('archived_cards')
      .select('*')
      .eq('item_type', ARCHIVED_CARD_TYPE.TASK)
      .eq('board_id', boardId)
      .order('archived_at', { ascending: false });

    if (error) {
      set({ archivedTasks: [] });
      return [];
    }

    const nextArchivedTasks = (data || []).map(toArchivedTaskRecord);
    set({ archivedTasks: nextArchivedTasks });
    return nextArchivedTasks;
  },

  fetchArchivedCards: async () => {
    const user = await getAuthenticatedUser();
    if (!user?.id) {
      set({ archivedCards: [] });
      return [];
    }

    const { data, error } = await supabase
      .from('archived_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('archived_at', { ascending: false });

    if (error) {
      set({ archivedCards: [] });
      return [];
    }

    const nextArchivedCards = (data || []).map(toArchivedCardItem);
    set({ archivedCards: nextArchivedCards });
    return nextArchivedCards;
  },

  createBoard: async (title, isPublic = false) => {
    set({ isLoading: true });

    try {
      const user = await getAuthenticatedUser();
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
    const user = await getAuthenticatedUser();
    if (!user) return null;

    const { data: newColumn, error } = await supabase
      .from('columns')
      .insert([{ board_id: boardId, title, user_id: user.id }])
      .select()
      .single();

    if (error || !newColumn) return null;

    set((state) => ({ columns: [...state.columns, newColumn] }));
    return newColumn;
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
    const user = await getAuthenticatedUser();
    if (!user) return null;

    const { data: newTask } = await insertTaskRecord({ column_id: columnId, title, user_id: user.id, color: null });

    if (newTask) {
      set((state) => ({ tasks: [...state.tasks, newTask] }));
    }

    return newTask;
  },

  addInboxIdea: async (title) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return null;

    const user = await getAuthenticatedUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('inbox_items')
      .insert([
        {
          user_id: user.id,
          title: trimmedTitle,
          description: '',
          due_date: null,
          position: getPositionSeed(),
          color: null,
          is_archived: false,
        },
      ])
      .select()
      .single();

    if (error || !data) return null;

    await get().loadInboxIdeas();
    return data;
  },

  updateInboxIdea: async (id, updates) => {
    const nextUpdates = {
      ...updates,
    };

    if (typeof nextUpdates.title === 'string') {
      const trimmedTitle = nextUpdates.title.trim();
      if (!trimmedTitle) return null;
      nextUpdates.title = trimmedTitle;
    }

    const { data, error } = await supabase.from('inbox_items').update(nextUpdates).eq('id', id).select().single();

    if (error || !data) return null;

    await get().loadInboxIdeas();
    return data;
  },

  archiveInboxIdea: async (id) => {
    const idea = get().inboxIdeas.find((item) => item.id === id);
    const user = await getAuthenticatedUser();

    if (!idea || !user?.id) return null;

    const { data, error } = await supabase
      .from('inbox_items')
      .update({ is_archived: true })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;

    const { error: archiveError } = await upsertArchivedCard({
      user_id: user.id,
      item_type: ARCHIVED_CARD_TYPE.INBOX,
      source_id: data.id,
      board_id: null,
      column_id: null,
      title: data.title,
      description: data.description || '',
      due_date: data.due_date || null,
      color: data.color || null,
      created_at: data.created_at || new Date().toISOString(),
    });

    if (archiveError) {
      await supabase.from('inbox_items').update({ is_archived: false }).eq('id', id);
      return null;
    }

    await get().loadInboxIdeas();
    await get().fetchArchivedCards();
    return data;
  },

  unarchiveInboxIdea: async (id) => {
    const { data, error } = await supabase
      .from('inbox_items')
      .update({ is_archived: false, position: getPositionSeed() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;

    const { error: archiveError } = await deleteArchivedCard(ARCHIVED_CARD_TYPE.INBOX, id);
    if (archiveError) {
      await supabase.from('inbox_items').update({ is_archived: true, position: data.position }).eq('id', id);
      return null;
    }

    await get().loadInboxIdeas();
    await get().fetchArchivedCards();
    return data;
  },

  deleteInboxIdea: async (id) => {
    const { error } = await supabase.from('inbox_items').delete().eq('id', id);
    if (error) return false;

    await deleteArchivedCard(ARCHIVED_CARD_TYPE.INBOX, id);
    await get().loadInboxIdeas();
    await get().fetchArchivedCards();
    return true;
  },

  moveTaskToInbox: async (taskId) => {
    const task = get().tasks.find((item) => item.id === taskId);
    const user = await getAuthenticatedUser();

    if (!task || !user) return null;

    const { data: inboxItem, error: insertError } = await supabase
      .from('inbox_items')
      .insert([
        {
          user_id: user.id,
          title: task.title,
          description: task.description || '',
          due_date: task.due_date || null,
          position: getPositionSeed(),
          color: task.color || null,
          is_archived: false,
          created_at: task.created_at || undefined,
        },
      ])
      .select()
      .single();

    if (insertError || !inboxItem) return null;

    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', taskId);

    if (deleteError) {
      await supabase.from('inbox_items').delete().eq('id', inboxItem.id);
      return null;
    }

    set((state) => ({
      tasks: state.tasks.filter((item) => item.id !== taskId),
      archivedTasks: state.archivedTasks.filter((item) => item.id !== taskId),
    }));

    await get().loadInboxIdeas();
    return inboxItem;
  },

  moveInboxIdeaToColumn: async (ideaId, columnId) => {
    const idea = get().inboxIdeas.find((item) => item.id === ideaId);
    const user = await getAuthenticatedUser();

    if (!idea || !user) return null;

    const { data: newTask, error: taskError } = await insertTaskRecord({
      column_id: columnId,
      title: idea.title,
      description: idea.description || '',
      due_date: idea.due_date || null,
      user_id: user.id,
      color: idea.color || null,
    });

    if (taskError || !newTask) return null;

    const { error: deleteError } = await supabase.from('inbox_items').delete().eq('id', ideaId);

    if (deleteError) {
      await supabase.from('tasks').delete().eq('id', newTask.id);
      return null;
    }

    set((state) => ({
      tasks: [...state.tasks, newTask],
    }));

    await get().loadInboxIdeas();
    return newTask;
  },

  updateTask: async (id, updates) => {
    const { data } = await updateTaskRecord(id, updates);

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
    const user = await getAuthenticatedUser();
    const currentColumn = get().columns.find((column) => column.id === currentTask?.column_id);

    if (!currentTask || !user?.id) return null;

    const { data, error } = await supabase.from('tasks').update({ is_archived: true }).eq('id', id).select().single();
    if (error || !data) return null;

    const { error: archiveError } = await upsertArchivedCard({
      user_id: user.id,
      item_type: ARCHIVED_CARD_TYPE.TASK,
      source_id: data.id,
      board_id: currentColumn?.board_id || get().currentBoardId || null,
      column_id: data.column_id || null,
      title: data.title,
      description: data.description || '',
      due_date: data.due_date || null,
      color: data.color || null,
      created_at: data.created_at || new Date().toISOString(),
    });

    if (archiveError) {
      await supabase.from('tasks').update({ is_archived: false }).eq('id', id);
      return null;
    }

    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      archivedTasks: [toArchivedTaskRecord({
        source_id: data.id,
        title: data.title,
        description: data.description,
        due_date: data.due_date,
        color: data.color,
        column_id: data.column_id,
        board_id: currentColumn?.board_id || get().currentBoardId || null,
        created_at: data.created_at,
        archived_at: new Date().toISOString(),
      }), ...state.archivedTasks.filter((task) => task.id !== id)],
    }));

    await get().fetchArchivedCards();
    return data;
  },

  unarchiveTask: async (id) => {
    const archivedTask = get().archivedTasks.find((task) => task.id === id);
    if (!archivedTask) return null;

    const { data, error } = await supabase.from('tasks').update({ is_archived: false }).eq('id', id).select().single();
    if (error || !data) return null;

    const { error: archiveError } = await deleteArchivedCard(ARCHIVED_CARD_TYPE.TASK, id);
    if (archiveError) {
      await supabase.from('tasks').update({ is_archived: true }).eq('id', id);
      return null;
    }

    set((state) => ({
      archivedTasks: state.archivedTasks.filter((task) => task.id !== id),
      tasks: [...state.tasks.filter((task) => task.id !== id), data],
    }));

    await get().fetchArchivedCards();
    return data;
  },

  deleteTask: async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    await deleteArchivedCard(ARCHIVED_CARD_TYPE.TASK, id);

    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      archivedTasks: state.archivedTasks.filter((task) => task.id !== id),
    }));

    await get().fetchArchivedCards();
  },

  restoreArchivedCard: async (item) => {
    if (!item?.source_id || !item?.item_type) return null;

    if (item.item_type === ARCHIVED_CARD_TYPE.TASK) {
      const currentArchivedTasks = get().archivedTasks;

      if (!currentArchivedTasks.some((task) => task.id === item.source_id)) {
        set((state) => ({
          archivedTasks: [
            ...state.archivedTasks,
            {
              id: item.source_id,
              title: item.title,
              description: item.description || '',
              due_date: item.due_date || null,
              color: item.color || null,
              column_id: item.column_id || null,
              board_id: item.board_id || null,
              is_archived: true,
              archived_at: item.archived_at,
              created_at: item.created_at || item.archived_at,
            },
          ],
        }));
      }

      return get().unarchiveTask(item.source_id);
    }

    if (item.item_type === ARCHIVED_CARD_TYPE.INBOX) {
      return get().unarchiveInboxIdea(item.source_id);
    }

    return null;
  },

  deleteArchivedCardPermanently: async (item) => {
    if (!item?.source_id || !item?.item_type) return false;

    if (item.item_type === ARCHIVED_CARD_TYPE.TASK) {
      await supabase.from('tasks').delete().eq('id', item.source_id);
      await deleteArchivedCard(ARCHIVED_CARD_TYPE.TASK, item.source_id);
      set((state) => ({
        archivedTasks: state.archivedTasks.filter((task) => task.id !== item.source_id),
      }));
      await get().fetchArchivedCards();
      return true;
    }

    if (item.item_type === ARCHIVED_CARD_TYPE.INBOX) {
      await supabase.from('inbox_items').delete().eq('id', item.source_id);
      await deleteArchivedCard(ARCHIVED_CARD_TYPE.INBOX, item.source_id);
      await get().loadInboxIdeas();
      await get().fetchArchivedCards();
      return true;
    }

    return false;
  },
}));

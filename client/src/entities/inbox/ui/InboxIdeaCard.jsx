import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  ArchiveRestore,
  CalendarDays,
  Clock3,
  MessageSquare,
  MoreHorizontal,
  PaintBucket,
  Paperclip,
  Plus,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useBoardStore } from '../../board/model/store';
import { useConfirmStore } from '../../../shared/model/confirmStore';
import { useAuthStore } from '../../session/model/authStore';

const CARD_COLORS = ['#334155', '#2563eb', '#059669', '#d97706', '#e11d48', '#7c3aed'];
const LABEL_COLORS = ['#2563eb', '#059669', '#d97706', '#e11d48', '#7c3aed', '#0891b2'];

const formatDue = (value) => (value ? new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : null);
const formatDateTime = (value) =>
  new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith('#')) return `rgba(255, 255, 255, ${alpha})`;
  const normalized = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export const InboxIdeaCard = ({ idea, showArchived = false, isOverlay = false, dndId }) => {
  const requestConfirm = useConfirmStore((state) => state.requestConfirm);
  const currentUser = useAuthStore((state) => state.user);
  const {
    inboxLabels,
    updateInboxIdea,
    archiveInboxIdea,
    unarchiveInboxIdea,
    deleteInboxIdea,
    fetchInboxLabels,
    createInboxLabel,
    setInboxItemLabels,
    fetchInboxComments,
    addInboxComment,
    deleteInboxComment,
    fetchInboxAttachments,
    uploadInboxAttachment,
    deleteInboxAttachment,
    loadInboxIdeas,
  } = useBoardStore();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [labels, setLabels] = useState(inboxLabels || []);
  const [selectedLabelIds, setSelectedLabelIds] = useState((idea.labels || []).map((label) => label.id));
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [edit, setEdit] = useState({
    title: idea.title,
    desc: idea.description || '',
    date: idea.due_date?.slice(0, 16) || '',
    color: idea.color || '',
  });

  const menuRef = useRef(null);
  const modalRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragFlagRef = useRef(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dndId || `inbox:${idea.id}`,
    disabled: showArchived || isMenuOpen || isModalOpen || isOverlay,
  });

  useEffect(() => {
    setEdit({
      title: idea.title,
      desc: idea.description || '',
      date: idea.due_date?.slice(0, 16) || '',
      color: idea.color || '',
    });
    setSelectedLabelIds((idea.labels || []).map((label) => label.id));
  }, [idea.id, idea.title, idea.description, idea.due_date, idea.color, idea.labels]);

  useEffect(() => {
    setLabels(inboxLabels || []);
  }, [inboxLabels]);

  useEffect(() => {
    if (isDragging) dragFlagRef.current = true;
  }, [isDragging]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const handleEscape = (event) => event.key === 'Escape' && setIsModalOpen(false);
    const handleOutside = (event) => modalRef.current && !modalRef.current.contains(event.target) && setIsModalOpen(false);
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleOutside);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleOutside);
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      const [nextLabels, nextComments, nextAttachments] = await Promise.all([
        fetchInboxLabels(),
        fetchInboxComments(idea.id),
        fetchInboxAttachments(idea.id),
      ]);
      if (cancelled) return;
      setLabels(nextLabels || []);
      setComments(nextComments || []);
      setAttachments(nextAttachments || []);
      setIsLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, idea.id, fetchInboxLabels, fetchInboxComments, fetchInboxAttachments]);

  const style = {
    transform: isOverlay ? undefined : CSS.Translate.toString(transform),
    opacity: isDragging && !isOverlay ? 0.35 : 1,
    borderColor: idea.color || undefined,
    background: idea.color
      ? `linear-gradient(180deg, ${hexToRgba(idea.color, 0.34)} 0%, rgba(27, 31, 38, 0.98) 72%)`
      : undefined,
    boxShadow: idea.color ? `0 12px 28px rgba(15, 23, 42, 0.22), inset 0 0 0 1px ${hexToRgba(idea.color, 0.28)}` : undefined,
  };

  const selectedLabels = useMemo(
    () => labels.filter((label) => selectedLabelIds.includes(label.id)),
    [labels, selectedLabelIds]
  );

  const openModal = () => {
    if (dragFlagRef.current) {
      dragFlagRef.current = false;
      return;
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const savedIdea = await updateInboxIdea(idea.id, {
      title: edit.title.trim() || idea.title,
      description: edit.desc,
      due_date: edit.date || null,
      color: edit.color || null,
    });
    if (savedIdea) setIsModalOpen(false);
  };

  const toggleLabel = async (labelId) => {
    const nextIds = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId];
    setSelectedLabelIds(nextIds);
    const synced = await setInboxItemLabels(idea.id, nextIds);
    if (synced) {
      setSelectedLabelIds(synced.map((label) => label.id));
      await loadInboxIdeas();
    }
  };

  const createLabel = async () => {
    const name = labelDraft.trim();
    if (!name) return;
    const label = await createInboxLabel(name, LABEL_COLORS[labels.length % LABEL_COLORS.length]);
    if (!label) return;
    setLabels((state) => [...state, label]);
    setLabelDraft('');
    await toggleLabel(label.id);
  };

  const sendComment = async () => {
    const body = commentDraft.trim();
    if (!body) return;
    const comment = await addInboxComment(idea.id, body);
    if (!comment) return;
    setComments((state) => [...state, comment]);
    setCommentDraft('');
    await loadInboxIdeas();
  };

  const removeComment = async (commentId) => {
    const ok = await requestConfirm({ title: 'Удалить комментарий', message: 'Комментарий будет удален.' });
    if (!ok) return;
    const removed = await deleteInboxComment(commentId);
    if (removed) {
      setComments((state) => state.filter((comment) => comment.id !== commentId));
      await loadInboxIdeas();
    }
  };

  const onFilesSelected = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setIsUploading(true);
    const uploaded = [];
    for (const file of files) {
      const attachment = await uploadInboxAttachment(idea.id, file);
      if (attachment) uploaded.push(attachment);
    }
    if (uploaded.length) {
      setAttachments((state) => [...uploaded, ...state]);
      await loadInboxIdeas();
    }
    setIsUploading(false);
    event.target.value = '';
  };

  const removeAttachment = async (attachmentId) => {
    const ok = await requestConfirm({ title: 'Удалить вложение', message: 'Вложение будет удалено.' });
    if (!ok) return;
    const removed = await deleteInboxAttachment(attachmentId);
    if (removed) {
      setAttachments((state) => state.filter((attachment) => attachment.id !== attachmentId));
      await loadInboxIdeas();
    }
  };

  const modalMarkup =
    isModalOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md sm:p-6">
            <div ref={modalRef} className="kb-edit-modal mx-auto max-h-[calc(100dvh-24px)] w-full max-w-5xl overflow-y-auto rounded-[28px] sm:max-h-[calc(100dvh-48px)]">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-5 py-4 sm:px-7">
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <span className="kb-chip bg-slate-100 text-slate-700"><Tag size={12} />Inbox</span>
                    {edit.date ? <span className="kb-chip bg-blue-100 text-blue-700"><CalendarDays size={12} />{formatDateTime(edit.date)}</span> : null}
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Редактирование задумки</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                  <X size={18} />
                </button>
              </div>
              <div className="grid gap-6 px-5 py-5 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.65fr)_360px]">
                <div className="space-y-6">
                  <div className="space-y-4 rounded-3xl border border-slate-200 bg-white/75 p-5">
                    <input value={edit.title} onChange={(event) => setEdit((state) => ({ ...state, title: event.target.value }))} placeholder="Название задумки" className="kb-edit-input px-4 py-3" />
                    <textarea rows={7} value={edit.desc} onChange={(event) => setEdit((state) => ({ ...state, desc: event.target.value }))} placeholder="Описание" className="kb-edit-input min-h-[170px] resize-y px-4 py-3" />
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white/75 p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><MessageSquare size={15} />Комментарии</div>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                      <textarea rows={3} value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Напишите комментарий" className="kb-edit-input min-h-[90px] flex-1 resize-y px-4 py-3" />
                      <button type="button" onClick={sendComment} className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"><Plus size={14} className="inline mr-1" />Отправить</button>
                    </div>
                    <div className="space-y-3">
                      {comments.length ? comments.map((comment) => (
                        <div key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4">
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                            <span>{comment.user_id === currentUser?.id ? 'Вы' : 'Комментарий'}</span>
                            <div className="flex items-center gap-3">
                              <span>{formatDateTime(comment.created_at)}</span>
                              {comment.user_id === currentUser?.id ? <button type="button" onClick={() => removeComment(comment.id)} className="font-semibold text-rose-500">Удалить</button> : null}
                            </div>
                          </div>
                          <p className="text-sm leading-6 text-slate-700">{comment.body}</p>
                        </div>
                      )) : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">Комментариев пока нет.</div>}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white/75 p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Paperclip size={15} />Вложения</div>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFilesSelected} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="mb-4 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                      <Upload size={14} className="mr-1 inline" />{isUploading ? 'Загрузка...' : 'Загрузить файлы'}
                    </button>
                    <div className="space-y-3">
                      {attachments.length ? attachments.map((attachment) => (
                        <div key={attachment.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/85 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-700">{attachment.file_name}</div>
                            <div className="mt-1 text-xs text-slate-400">{attachment.file_size ? `${Math.max(1, Math.round(attachment.file_size / 1024))} KB` : 'Размер неизвестен'}</div>
                          </div>
                          <div className="flex gap-2">
                            {attachment.url ? <a href={attachment.url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">Открыть</a> : null}
                            <button type="button" onClick={() => removeAttachment(attachment.id)} className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">Удалить</button>
                          </div>
                        </div>
                      )) : <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-400">Вложений пока нет.</div>}
                    </div>
                  </div>
                </div>
                <aside className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><PaintBucket size={15} />Цвет карточки</div>
                    <div className="grid grid-cols-3 gap-2">
                      {CARD_COLORS.map((color) => (
                        <button key={color} type="button" onClick={() => setEdit((state) => ({ ...state, color }))} className={`h-11 rounded-2xl border ${edit.color === color ? 'border-slate-900' : 'border-slate-200'}`} style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <button type="button" onClick={() => setEdit((state) => ({ ...state, color: '' }))} className="mt-3 text-sm font-medium text-slate-500">Сбросить цвет</button>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays size={15} />Срок</div>
                    <input type="datetime-local" value={edit.date} onChange={(event) => setEdit((state) => ({ ...state, date: event.target.value }))} className="kb-edit-input min-w-0 px-3 py-2.5" />
                    <button type="button" onClick={() => setEdit((state) => ({ ...state, date: '' }))} className="mt-3 text-sm font-medium text-slate-500">Очистить дату</button>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><Tag size={15} />Метки</div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedLabels.length ? selectedLabels.map((label) => (
                        <span key={label.id} className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: `${label.color || '#64748b'}22`, color: label.color || '#475569' }}>
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color || '#64748b' }} />
                          {label.name}
                        </span>
                      )) : <span className="text-sm text-slate-400">Метки еще не выбраны</span>}
                    </div>
                    <div className="grid gap-2">
                      {labels.map((label) => (
                        <button key={label.id} type="button" onClick={() => toggleLabel(label.id)} className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left text-sm ${selectedLabelIds.includes(label.id) ? 'border-slate-300 bg-white' : 'border-slate-200 bg-white/70'}`}>
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color || '#64748b' }} />
                          <span className="flex-1 truncate font-medium text-slate-700">{label.name}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input value={labelDraft} onChange={(event) => setLabelDraft(event.target.value)} placeholder="Новая метка" className="kb-edit-input px-4 py-3" />
                      <button type="button" onClick={createLabel} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">Добавить</button>
                    </div>
                  </div>
                  {isLoading ? <div className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5 text-sm text-slate-400">Загружаю детали...</div> : null}
                </aside>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200/70 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button onClick={() => setIsModalOpen(false)} className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 sm:w-auto">Отмена</button>
                <button onClick={handleSave} className="w-full rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white sm:w-auto">Сохранить</button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={openModal}
        className={`kb-card kb-card--inbox group relative ${isOverlay ? 'kb-card--overlay' : ''}`}
      >
        {!isOverlay ? (
          <div ref={menuRef} className="absolute right-2 top-2 z-20">
            <button onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setIsMenuOpen((value) => !value); }} className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 opacity-100 transition hover:bg-white/10 hover:text-white">
              <MoreHorizontal size={16} />
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 top-10 z-30 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {showArchived ? (
                  <button onClick={async (event) => { event.stopPropagation(); await unarchiveInboxIdea(idea.id); setIsMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50">
                    <ArchiveRestore size={14} />Вернуть из архива
                  </button>
                ) : (
                  <button onClick={async (event) => { event.stopPropagation(); await archiveInboxIdea(idea.id); setIsMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50">
                    <ArchiveRestore size={14} />В архив
                  </button>
                )}
                <button
                  onClick={async (event) => {
                    event.stopPropagation();
                    const ok = await requestConfirm({ title: 'Удалить задумку', message: `Задумка "${idea.title}" будет удалена.` });
                    if (ok) {
                      await deleteInboxIdea(idea.id);
                      setIsMenuOpen(false);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <Trash2 size={14} />Удалить
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div {...(isOverlay ? {} : listeners)} {...(isOverlay ? {} : attributes)} className={isOverlay ? '' : 'kb-dnd-handle'}>
          <h4 className="pr-8 text-sm font-bold leading-6 text-white">{idea.title}</h4>
          {idea.labels?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {idea.labels.slice(0, 3).map((label) => (
                <span key={label.id} className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: `${label.color || '#64748b'}22`, color: label.color || '#cbd5e1' }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color || '#64748b' }} />
                  {label.name}
                </span>
              ))}
            </div>
          ) : null}
          {idea.description ? <p className="mt-2 text-sm leading-6 text-slate-400">{idea.description}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            {formatDue(idea.due_date) ? <span className="inline-flex items-center gap-1"><Clock3 size={12} />{formatDue(idea.due_date)}</span> : <span>Без срока</span>}
            {idea.labels?.length ? <span className="inline-flex items-center gap-1"><Tag size={12} />{idea.labels.length}</span> : null}
            {idea.comments_count ? <span className="inline-flex items-center gap-1"><MessageSquare size={12} />{idea.comments_count}</span> : null}
            {idea.attachments_count ? <span className="inline-flex items-center gap-1"><Paperclip size={12} />{idea.attachments_count}</span> : null}
          </div>
        </div>
      </div>
      {modalMarkup}
    </>
  );
};

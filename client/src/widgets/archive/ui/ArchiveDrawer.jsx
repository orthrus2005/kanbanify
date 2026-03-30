import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Archive, ArchiveRestore, Clock3, Search, Trash2, X } from 'lucide-react';
import { useBoardStore } from '../../../entities/board/model/store';
import { useConfirmStore } from '../../../shared/model/confirmStore';

const DAY_MS = 24 * 60 * 60 * 1000;

const getArchiveBucket = (value) => {
  const timestamp = new Date(value || 0).getTime();
  const diff = Date.now() - timestamp;
  if (diff <= 7 * DAY_MS) return '7';
  if (diff <= 14 * DAY_MS) return '14';
  return 'older';
};

const formatArchiveDate = (value) =>
  new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const SECTION_LABELS = {
  '7': 'За последние 7 дней',
  '14': 'За последние 14 дней',
  older: 'Раньше',
};

export const ArchiveDrawer = ({ isOpen, onClose }) => {
  const { archivedCards, fetchArchivedCards, restoreArchivedCard, deleteArchivedCardPermanently, boards, publicBoards, columns } = useBoardStore();
  const requestConfirm = useConfirmStore((state) => state.requestConfirm);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    let active = true;
    setIsLoading(true);

    fetchArchivedCards()
      .catch(() => [])
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, fetchArchivedCards]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;

    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const handlePointerDown = (event) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen, onClose]);

  const boardMap = useMemo(() => new Map([...boards, ...publicBoards].map((board) => [board.id, board.title])), [boards, publicBoards]);
  const columnMap = useMemo(() => new Map(columns.map((column) => [column.id, column.title])), [columns]);

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return archivedCards.filter((item) => {
      if (!normalizedQuery) return true;

      const boardTitle = boardMap.get(item.board_id) || '';
      const columnTitle = columnMap.get(item.column_id) || '';
      return [item.title, item.description, boardTitle, columnTitle]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [archivedCards, boardMap, columnMap, query]);

  const groupedCards = useMemo(() => {
    const groups = { '7': [], '14': [], older: [] };

    filteredCards.forEach((item) => {
      groups[getArchiveBucket(item.archived_at)].push(item);
    });

    return groups;
  }, [filteredCards]);

  const handleDelete = async (item) => {
    const ok = await requestConfirm({
      title: 'Удалить из архива',
      message: `Карточка "${item.title}" будет удалена полностью без возможности восстановления.`,
    });

    if (ok) {
      await deleteArchivedCardPermanently(item);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-transparent">
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 flex h-full w-full max-w-[380px] flex-col border-l border-white/10 bg-[#171a20] text-white shadow-[-28px_0_90px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/8 hover:text-white">
            <X size={18} />
          </button>
          <h3 className="text-lg font-black tracking-tight">Архив</h3>
          <div className="w-9" />
        </div>

        <div className="border-b border-white/10 px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/38" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск"
              className="w-full rounded-xl border border-white/12 bg-[#101319] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-blue-400/55 focus:bg-[#121722]"
            />
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-[#1d2128] px-4 py-10 text-center text-sm text-white/60">
              Загружаю архив...
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#1d2128] px-4 py-10 text-center text-sm text-white/60">
              В архиве пока ничего нет.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedCards).map(([key, items]) =>
                items.length ? (
                  <section key={key}>
                    <div className="mb-3 text-sm font-semibold text-white/62">{SECTION_LABELS[key]}</div>
                    <div className="space-y-4">
                      {items.map((item) => {
                        const boardTitle = boardMap.get(item.board_id);
                        const columnTitle = item.item_type === 'task' ? columnMap.get(item.column_id) : 'Архивная';

                        return (
                          <article
                            key={item.id}
                            className="rounded-2xl border border-white/8 bg-[#20242c] p-4 shadow-[0_14px_36px_rgba(0,0,0,0.28),inset_0_0_0_1px_rgba(255,255,255,0.03)]"
                          >
                            <div className="mb-3 flex items-start gap-3">
                              <div
                                className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full"
                                style={{ backgroundColor: item.color || '#84cc16' }}
                              />
                              <div className="min-w-0 flex-1">
                                <h4 className="truncate text-base font-semibold text-white">{item.title}</h4>
                                {item.description ? (
                                  <p className="mt-2 text-sm leading-6 text-white/60">{item.description}</p>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-white/48">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1">
                                <Archive size={11} />
                                {item.item_type === 'task' ? 'Задача' : 'Inbox'}
                              </span>
                              {columnTitle ? <span>{columnTitle}</span> : null}
                              {boardTitle ? <span>• {boardTitle}</span> : null}
                              <span className="inline-flex items-center gap-1">
                                <Clock3 size={11} />
                                {formatArchiveDate(item.archived_at)}
                              </span>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                              <button
                                type="button"
                                onClick={() => restoreArchivedCard(item)}
                                className="inline-flex items-center gap-2 font-semibold text-white/88 transition hover:text-white"
                              >
                                <ArchiveRestore size={14} />
                                Восстановить
                              </button>
                              <span className="text-white/24">•</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                className="inline-flex items-center gap-2 font-semibold text-rose-300 transition hover:text-rose-200"
                              >
                                <Trash2 size={14} />
                                Удалить
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

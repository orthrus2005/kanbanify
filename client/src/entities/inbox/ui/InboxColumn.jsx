import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Archive, Check, ChevronRight, ImagePlus, Inbox, ListFilter, Menu, PaintBucket, Plus, Settings, SlidersHorizontal, X } from 'lucide-react';
import { useBoardStore } from '../../board/model/store';
import { InboxIdeaCard } from './InboxIdeaCard';

const photoPresets = [
  {
    id: 'glacier',
    label: 'Ледник',
    value:
      'linear-gradient(180deg, rgba(18,24,38,0.14), rgba(18,24,38,0.46)), url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80)',
  },
  {
    id: 'canyon',
    label: 'Каньон',
    value:
      'linear-gradient(180deg, rgba(18,24,38,0.1), rgba(18,24,38,0.42)), url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80)',
  },
  {
    id: 'ocean',
    label: 'Океан',
    value:
      'linear-gradient(180deg, rgba(18,24,38,0.1), rgba(18,24,38,0.45)), url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80)',
  },
];

const colorPresets = [
  { id: 'violet', label: 'Фиолетовый', value: 'linear-gradient(180deg, #4338ca 0%, #312e81 100%)' },
  { id: 'sunset', label: 'Закат', value: 'linear-gradient(180deg, #fb7185 0%, #f97316 100%)' },
  { id: 'teal', label: 'Бирюзовый', value: 'linear-gradient(180deg, #0f766e 0%, #134e4a 100%)' },
];

const isCreatedWithin = (item, days) => {
  if (!item.created_at) return false;
  const createdAt = new Date(item.created_at).getTime();
  return Date.now() - createdAt <= days * 24 * 60 * 60 * 1000;
};

const getDueBucket = (item) => {
  if (!item.due_date) return 'none';
  const now = Date.now();
  const due = new Date(item.due_date).getTime();
  const diff = due - now;

  if (diff < 0) return 'overdue';
  if (diff <= 24 * 60 * 60 * 1000) return 'day';
  if (diff <= 7 * 24 * 60 * 60 * 1000) return 'week';
  if (diff <= 30 * 24 * 60 * 60 * 1000) return 'month';
  return 'future';
};

export const InboxColumn = () => {
  const { inboxIdeas, archivedInboxIdeas, addInboxIdea } = useBoardStore();
  const { setNodeRef, isOver } = useDroppable({ id: 'inbox' });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isBackgroundOpen, setIsBackgroundOpen] = useState(false);
  const [backgroundTab, setBackgroundTab] = useState('photos');
  const [sortMode, setSortMode] = useState('newest');
  const [showArchived, setShowArchived] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [backgroundValue, setBackgroundValue] = useState(photoPresets[0].value);
  const [customBackground, setCustomBackground] = useState('');
  const [filters, setFilters] = useState({
    keyword: '',
    createdWithin: '',
    due: [],
  });

  const menuRef = useRef(null);
  const filterRef = useRef(null);
  const backgroundRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedBackground = customBackground || backgroundValue;

  useEffect(() => {
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
      if (filterRef.current && !filterRef.current.contains(event.target)) setIsFilterOpen(false);
      if (backgroundRef.current && !backgroundRef.current.contains(event.target)) setIsBackgroundOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const visibleIdeas = useMemo(() => {
    const sourceIdeas = showArchived ? archivedInboxIdeas : inboxIdeas;

    let nextIdeas = sourceIdeas.filter((idea) => {
      const keywordMatch = filters.keyword.trim()
        ? idea.title?.toLowerCase().includes(filters.keyword.trim().toLowerCase())
        : true;

      const createdMatch =
        !filters.createdWithin ||
        (filters.createdWithin === '7' && isCreatedWithin(idea, 7)) ||
        (filters.createdWithin === '14' && isCreatedWithin(idea, 14)) ||
        (filters.createdWithin === '30' && isCreatedWithin(idea, 30));

      const dueBuckets = filters.due.length ? filters.due : null;
      const dueMatch = dueBuckets ? dueBuckets.includes(getDueBucket(idea)) : true;

      return keywordMatch && createdMatch && dueMatch;
    });

    nextIdeas = [...nextIdeas].sort((left, right) => {
      if (sortMode === 'alpha') return (left.title || '').localeCompare(right.title || '', 'ru');
      if (sortMode === 'oldest') return new Date(left.created_at || 0) - new Date(right.created_at || 0);
      if (sortMode === 'due') {
        const leftDue = left.due_date ? new Date(left.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const rightDue = right.due_date ? new Date(right.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return leftDue - rightDue;
      }
      return new Date(right.created_at || 0) - new Date(left.created_at || 0);
    });

    return nextIdeas;
  }, [inboxIdeas, archivedInboxIdeas, showArchived, filters, sortMode]);

  const toggleDueFilter = (value) => {
    setFilters((state) => ({
      ...state,
      due: state.due.includes(value) ? state.due.filter((item) => item !== value) : [...state.due, value],
    }));
  };

  const handleUploadBackground = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCustomBackground(`linear-gradient(180deg, rgba(18,24,38,0.12), rgba(18,24,38,0.45)), url(${objectUrl})`);
    setIsBackgroundOpen(false);
  };

  const handleAddIdea = async () => {
    if (!newTitle.trim()) return;
    await addInboxIdea(newTitle.trim());
    setNewTitle('');
  };

  return (
    <div className="kb-inbox-column relative w-[320px] shrink-0 overflow-visible rounded-[24px] border border-slate-900/10 shadow-[0_30px_70px_rgba(15,23,42,0.2)]">
      <div className="absolute inset-0 rounded-[24px] bg-cover bg-center" style={{ backgroundImage: selectedBackground }} />
      <div className="relative rounded-[24px] bg-slate-950/18 p-3 backdrop-blur-[1px]">
        <div className="rounded-[22px] bg-white/95 p-3 shadow-lg shadow-slate-900/10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-slate-900">
              <Inbox size={18} />
              <h3 className="truncate text-xl font-black tracking-tight">Inbox</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsFilterOpen((value) => !value);
                  setIsMenuOpen(false);
                  setIsBackgroundOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800"
                aria-label="Открыть фильтр"
              >
                <ListFilter size={16} />
              </button>
              <button
                onClick={() => {
                  setIsMenuOpen((value) => !value);
                  setIsFilterOpen(false);
                  setIsBackgroundOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800"
                aria-label="Открыть меню inbox"
              >
                <Menu size={16} />
              </button>
            </div>
          </div>

          <div className="mb-3 space-y-2">
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.preventDefault();
              }}
              placeholder="Введите идею"
              className="w-full rounded-[14px] border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-slate-500"
            />
            <button
              type="button"
              onClick={handleAddIdea}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={15} />
              Добавить карточку
            </button>
          </div>

          <div
            ref={setNodeRef}
            className={`custom-scrollbar max-h-[55vh] space-y-2 overflow-y-auto pr-1 transition ${isOver ? 'rounded-[18px] bg-white/10 p-1' : ''}`}
          >
            {visibleIdeas.length > 0 ? (
              visibleIdeas.map((idea) => <InboxIdeaCard key={idea.id} idea={idea} showArchived={showArchived} dndId={`inbox:${idea.id}`} />)
            ) : (
              <div className="rounded-[18px] border border-dashed border-white/25 bg-slate-900/70 p-4 text-sm text-slate-300">
                {showArchived ? 'В архиве задумок пока ничего нет.' : 'Здесь будут только ваши задумки для этой доски.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div ref={menuRef} className="kb-inbox-popover absolute left-[calc(100%+14px)] top-12 z-40 w-[310px] rounded-[20px] bg-slate-800 p-4 text-white shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-bold">Меню</div>
            <button onClick={() => setIsMenuOpen(false)} className="rounded-xl border border-white/15 p-2 text-slate-300 transition hover:bg-white/5">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
                <SlidersHorizontal size={15} />
                Сортировка
              </div>
              <div className="grid gap-2">
                {[
                  ['newest', 'Сначала новые'],
                  ['oldest', 'Сначала старые'],
                  ['alpha', 'По алфавиту'],
                  ['due', 'По сроку'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setSortMode(value)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                      sortMode === value ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {label}
                    {sortMode === value ? <Check size={14} /> : null}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setShowArchived((value) => !value);
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-left text-slate-200 transition hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <Archive size={16} />
                {showArchived ? 'Вернуться к активным задумкам' : 'Просмотреть архив задумок'}
              </span>
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => {
                setIsBackgroundOpen(true);
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-left text-slate-200 transition hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <PaintBucket size={16} />
                Сменить фон
              </span>
              <ChevronRight size={16} />
            </button>

            <button
              onClick={() => {
                setFilters({ keyword: '', createdWithin: '', due: [] });
                setSortMode('newest');
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-left text-slate-200 transition hover:bg-white/10"
            >
              <span className="flex items-center gap-3">
                <Settings size={16} />
                Сбросить настройки вида
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {isFilterOpen && (
        <div ref={filterRef} className="kb-inbox-popover absolute left-[calc(100%+14px)] top-12 z-40 w-[340px] rounded-[20px] bg-slate-800 p-4 text-white shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-bold">Фильтр</div>
            <button onClick={() => setIsFilterOpen(false)} className="text-slate-400 transition hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">Ключевое слово</label>
              <input
                value={filters.keyword}
                onChange={(event) => setFilters((state) => ({ ...state, keyword: event.target.value }))}
                placeholder="Введите ключевое слово"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
              />
              <p className="mt-2 text-sm text-slate-400">Поиск задумок по названию.</p>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-slate-300">Задумка создана</div>
              <div className="space-y-2">
                {[
                  ['7', 'Создана за последнюю неделю'],
                  ['14', 'Создана за последние две недели'],
                  ['30', 'Создана за последний месяц'],
                ].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="radio"
                      name="createdWithin"
                      checked={filters.createdWithin === value}
                      onChange={() => setFilters((state) => ({ ...state, createdWithin: value }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-slate-300">Срок</div>
              <div className="space-y-2">
                {[
                  ['none', 'Без даты'],
                  ['overdue', 'Просроченные'],
                  ['day', 'Срок истекает в течение суток'],
                  ['week', 'Срок истекает в течение недели'],
                  ['month', 'Срок истекает в течение месяца'],
                ].map(([value, label]) => (
                  <label key={value} className="flex items-center gap-3 text-sm text-slate-300">
                    <input type="checkbox" checked={filters.due.includes(value)} onChange={() => toggleDueFilter(value)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={() => setFilters({ keyword: '', createdWithin: '', due: [] })}
              className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      )}

      {isBackgroundOpen && (
        <div ref={backgroundRef} className="kb-inbox-popover absolute left-[calc(100%+14px)] top-12 z-40 w-[360px] rounded-[20px] bg-slate-800 p-4 text-white shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-bold">Сменить фон</div>
            <button onClick={() => setIsBackgroundOpen(false)} className="text-slate-400 transition hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => setBackgroundTab('photos')}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${backgroundTab === 'photos' ? 'bg-white text-slate-900' : 'bg-white/5 text-slate-300'}`}
            >
              Фотографии
            </button>
            <button
              onClick={() => setBackgroundTab('colors')}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${backgroundTab === 'colors' ? 'bg-white text-slate-900' : 'bg-white/5 text-slate-300'}`}
            >
              Цвета
            </button>
          </div>

          {backgroundTab === 'photos' ? (
            <div className="grid grid-cols-3 gap-3">
              {photoPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setCustomBackground('');
                    setBackgroundValue(preset.value);
                    setIsBackgroundOpen(false);
                  }}
                  className="h-20 rounded-2xl bg-cover bg-center"
                  style={{ backgroundImage: preset.value }}
                  aria-label={preset.label}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {colorPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setCustomBackground('');
                    setBackgroundValue(preset.value);
                    setIsBackgroundOpen(false);
                  }}
                  className="h-20 rounded-2xl"
                  style={{ backgroundImage: preset.value }}
                  aria-label={preset.label}
                />
              ))}
            </div>
          )}

          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="mb-3 text-lg font-semibold">Пользовательские</div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUploadBackground} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-28 w-36 items-center justify-center rounded-2xl bg-white/8 text-slate-300 transition hover:bg-white/12"
            >
              <ImagePlus size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

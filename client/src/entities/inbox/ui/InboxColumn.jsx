import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDroppable } from '@dnd-kit/core';
import { Archive, Check, ChevronRight, ImagePlus, Inbox, ListFilter, Menu, PaintBucket, Plus, Settings, SlidersHorizontal, X } from 'lucide-react';
import { useBoardStore } from '../../board/model/store';
import { supabase } from '../../../shared/api/supabase';
import { useAuthStore } from '../../session/model/authStore';
import { InboxIdeaCard } from './InboxIdeaCard';

const photoPresets = [
  {
    id: 'glacier',
    label: 'Ледник',
    value:
      'linear-gradient(180deg, rgba(18,24,38,0.1), rgba(18,24,38,0.28)), url(https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=max&w=3840&q=100)',
  },
  {
    id: 'canyon',
    label: 'Каньон',
    value:
      'linear-gradient(180deg, rgba(18,24,38,0.08), rgba(18,24,38,0.28)), url(https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=max&w=3840&q=100)',
  },
  {
    id: 'ocean',
    label: 'Океан',
    value:
      'linear-gradient(180deg, rgba(18,24,38,0.08), rgba(18,24,38,0.28)), url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=max&w=3840&q=100)',
  },
];

const colorPresets = [
  { id: 'violet', label: 'Фиолетовый', value: 'linear-gradient(180deg, #4338ca 0%, #312e81 100%)' },
  { id: 'sunset', label: 'Закат', value: 'linear-gradient(180deg, #fb7185 0%, #f97316 100%)' },
  { id: 'teal', label: 'Бирюзовый', value: 'linear-gradient(180deg, #0f766e 0%, #134e4a 100%)' },
];

const INBOX_BACKGROUND_STORAGE_KEY = (userId) => `kanbanify-inbox-background-${userId || 'guest'}`;

const readStoredInboxBackground = (userId) => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(INBOX_BACKGROUND_STORAGE_KEY(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return parsed?.value ? parsed : null;
  } catch {
    return null;
  }
};

const writeStoredInboxBackground = (userId, value, isCustom) => {
  if (typeof window === 'undefined' || !value) return;

  window.localStorage.setItem(
    INBOX_BACKGROUND_STORAGE_KEY(userId),
    JSON.stringify({
      value,
      isCustom: Boolean(isCustom),
    })
  );
};

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

const compressImageToDataUrl = (file, maxSide = 1920, quality = 0.86) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const longestSide = Math.max(image.width, image.height) || 1;
        const scale = Math.min(1, maxSide / longestSide);
        const targetWidth = Math.max(1, Math.round(image.width * scale));
        const targetHeight = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas is not available'));
          return;
        }

        context.drawImage(image, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.onerror = () => reject(new Error('Failed to read image'));
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

export const InboxColumn = ({ expanded = false, contained = false }) => {
  const { inboxIdeas, archivedInboxIdeas, addInboxIdea } = useBoardStore();
  const { user } = useAuthStore();
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
  const filterButtonRef = useRef(null);
  const menuButtonRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastLoadedBackgroundRef = useRef(null);

  const selectedBackground = customBackground || backgroundValue;

  useEffect(() => {
    let isMounted = true;

    const loadInboxBackground = async () => {
      if (!user?.id) {
        if (!isMounted) return;
        setCustomBackground('');
        setBackgroundValue(photoPresets[0].value);
        lastLoadedBackgroundRef.current = null;
        return;
      }

      const { data, error } = await supabase
        .from('inbox_settings')
        .select('background_value, background_is_custom')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      const fallbackBackground = readStoredInboxBackground(user.id);
      const effectiveBackground = data?.background_value
        ? { value: data.background_value, isCustom: data.background_is_custom }
        : fallbackBackground;

      if (error) {
        console.error('Failed to load inbox background from DB', error);
      }

      if (!effectiveBackground?.value) {
        setCustomBackground('');
        setBackgroundValue(photoPresets[0].value);
        lastLoadedBackgroundRef.current = null;
        return;
      }

      lastLoadedBackgroundRef.current = effectiveBackground.value;

      if (effectiveBackground.isCustom) {
        setCustomBackground(effectiveBackground.value);
        return;
      }

      setCustomBackground('');
      setBackgroundValue(effectiveBackground.value);
    };

    void loadInboxBackground();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const persistInboxBackground = async (value, isCustom = false) => {
    if (!user?.id || !value || lastLoadedBackgroundRef.current === value) return;

    writeStoredInboxBackground(user.id, value, isCustom);

    const { error } = await supabase.from('inbox_settings').upsert(
      {
        user_id: user.id,
        background_value: value,
        background_is_custom: isCustom,
      },
      {
        onConflict: 'user_id',
      }
    );

    if (!error) {
      lastLoadedBackgroundRef.current = value;
      return;
    }

    console.error('Failed to save inbox background to DB', error);
  };

  const getPopoverStyle = (anchorRef, width) => {
    if (typeof window === 'undefined') return {};

    const rect = anchorRef.current?.getBoundingClientRect();
    const safeGap = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const finalWidth = Math.min(width, viewportWidth - safeGap * 2);

    if (!rect) {
      return {
        position: 'fixed',
        top: `${expanded ? 148 : 112}px`,
        left: `${safeGap}px`,
        width: `${finalWidth}px`,
        zIndex: 1400,
      };
    }

    const preferredLeft = rect.right + 14;
    const fallbackLeft = Math.max(safeGap, rect.left - finalWidth - 14);
    const left = preferredLeft + finalWidth + safeGap <= viewportWidth ? preferredLeft : fallbackLeft;
    const top = Math.min(Math.max(rect.top, safeGap), Math.max(safeGap, viewportHeight - 520));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${finalWidth}px`,
      zIndex: 1400,
    };
  };

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
    compressImageToDataUrl(file)
      .then(async (dataUrl) => {
        const nextBackground = `linear-gradient(180deg, rgba(18,24,38,0.12), rgba(18,24,38,0.45)), url(${dataUrl})`;
        setCustomBackground(nextBackground);
        await persistInboxBackground(nextBackground, true);
        setIsBackgroundOpen(false);
      })
      .finally(() => {
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
  };

  const handleAddIdea = async () => {
    if (!newTitle.trim()) return;
    await addInboxIdea(newTitle.trim());
    setNewTitle('');
  };

  const outerClassName = expanded
    ? 'kb-inbox-column kb-inbox-column--expanded h-full w-full min-w-0 rounded-[30px] border border-white/12 shadow-[0_28px_80px_rgba(15,23,42,0.22)]'
    : contained
      ? 'kb-inbox-column kb-inbox-column--contained h-full w-full min-w-0 rounded-[26px] border border-white/10 shadow-[0_20px_44px_rgba(15,23,42,0.16)]'
      : 'kb-inbox-column kb-inbox-column--default w-[320px] shrink-0 rounded-[24px] border border-slate-900/10 shadow-[0_30px_70px_rgba(15,23,42,0.2)]';

  const backgroundRadiusClass = expanded ? 'rounded-[30px]' : contained ? 'rounded-[26px]' : 'rounded-[24px]';
  const overlayClassName = expanded
    ? 'flex h-full min-h-0 items-start justify-center rounded-[30px] bg-slate-950/6 p-4 pt-6 sm:p-6 sm:pt-8'
    : contained
      ? 'flex h-full min-h-0 flex-col rounded-[26px] bg-slate-950/14 p-3'
      : 'rounded-[24px] bg-slate-950/18 p-3';
  const cardClassName = expanded
    ? 'mx-auto flex min-h-0 w-full max-w-[760px] flex-1 flex-col rounded-[26px] bg-slate-50/96 p-4 shadow-lg shadow-slate-900/10 sm:p-5'
    : contained
      ? 'flex min-h-0 flex-1 flex-col rounded-[22px] bg-slate-50/96 p-3 shadow-lg shadow-slate-900/10'
      : 'rounded-[22px] bg-slate-50/96 p-3 shadow-lg shadow-slate-900/10';
  const listClassName = expanded
    ? 'custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 transition'
    : contained
      ? 'custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 transition'
      : 'custom-scrollbar max-h-[55vh] space-y-2 overflow-y-auto pr-1 transition';

  return (
    <div className={`relative overflow-visible ${outerClassName}`}>
      <div
        className={`absolute inset-0 bg-cover bg-center ${backgroundRadiusClass}`}
        style={{
          backgroundImage: selectedBackground,
          backgroundSize: 'cover',
          backgroundPosition: expanded ? 'center center' : contained ? 'center center' : 'center bottom',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className={`relative ${expanded ? '' : 'backdrop-blur-[1px]'} ${overlayClassName}`}>
        <div className={cardClassName} style={expanded ? { height: 'min(60dvh, 600px)' } : undefined}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-slate-900">
              <Inbox size={18} />
              <h3 className="truncate text-xl font-black tracking-tight">Inbox</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                ref={filterButtonRef}
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
                ref={menuButtonRef}
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
            className={`${listClassName} ${isOver ? 'rounded-[18px] bg-white/10 p-1' : ''}`}
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

      {isMenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
        <div ref={menuRef} style={getPopoverStyle(menuButtonRef, 310)} className="kb-inbox-popover rounded-[20px] bg-slate-800 p-4 text-white shadow-2xl">
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
        </div>,
        document.body
      )}

      {isFilterOpen &&
        typeof document !== 'undefined' &&
        createPortal(
        <div ref={filterRef} style={getPopoverStyle(filterButtonRef, 340)} className="kb-inbox-popover rounded-[20px] bg-slate-800 p-4 text-white shadow-2xl">
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
        </div>,
        document.body
      )}

      {isBackgroundOpen &&
        typeof document !== 'undefined' &&
        createPortal(
        <div ref={backgroundRef} style={getPopoverStyle(menuButtonRef, 360)} className="kb-inbox-popover rounded-[20px] bg-slate-800 p-4 text-white shadow-2xl">
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
                    void persistInboxBackground(preset.value, false);
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
                    void persistInboxBackground(preset.value, false);
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
        </div>,
        document.body
      )}
    </div>
  );
};

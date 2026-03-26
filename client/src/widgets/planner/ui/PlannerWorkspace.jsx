import React from 'react';

const DEFAULT_PLANNER_SECTIONS = [
  {
    id: 'overdue',
    title: 'Просрочено',
    accentClass: 'bg-rose-500/18 text-rose-200',
    emptyLabel: 'Нет просроченных задач.',
    items: [],
  },
  {
    id: 'today',
    title: 'Сегодня',
    accentClass: 'bg-amber-500/18 text-amber-200',
    emptyLabel: 'На сегодня ничего не запланировано.',
    items: [],
  },
  {
    id: 'week',
    title: 'На неделе',
    accentClass: 'bg-emerald-500/18 text-emerald-200',
    emptyLabel: 'На ближайшую неделю задач нет.',
    items: [],
  },
  {
    id: 'later',
    title: 'Позже',
    accentClass: 'bg-sky-500/18 text-sky-200',
    emptyLabel: 'Долгосрочных задач пока нет.',
    items: [],
  },
  {
    id: 'no-date',
    title: 'Без срока',
    accentClass: 'bg-white/12 text-white/84',
    emptyLabel: 'Карточки без срока появятся здесь.',
    items: [],
  },
];

const PlannerSection = ({ title, accentClass, items, emptyLabel }) => (
  <section className="rounded-[28px] border border-white/10 bg-slate-950/28 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-md sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/88">{title}</h3>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${accentClass}`}>{items.length}</span>
    </div>

    {items.length ? (
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[22px] border border-white/10 bg-slate-950/58 p-4 text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)]"
            style={{
              borderColor: item.color || undefined,
              background: item.color
                ? `linear-gradient(180deg, ${item.color}33 0%, rgba(20,24,31,0.86) 82%)`
                : undefined,
            }}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {item.source ? (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">{item.source}</span>
              ) : null}
              {item.kind ? (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">{item.kind}</span>
              ) : null}
            </div>
            <h4 className="text-sm font-bold text-white">{item.title}</h4>
            {item.description ? <p className="mt-2 text-sm leading-6 text-white/62">{item.description}</p> : null}
            <div className="mt-3 text-xs font-semibold text-white/50">{item.meta || 'Без срока'}</div>
          </article>
        ))}
      </div>
    ) : (
      <div className="rounded-[22px] border border-dashed border-white/14 bg-white/7 px-4 py-6 text-sm text-white/76">{emptyLabel}</div>
    )}
  </section>
);

export const PlannerWorkspace = ({ sections = DEFAULT_PLANNER_SECTIONS }) => (
  <div className="custom-scrollbar h-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
    <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
      {sections.map((section) => (
        <PlannerSection
          key={section.id}
          title={section.title}
          accentClass={section.accentClass}
          items={section.items || []}
          emptyLabel={section.emptyLabel}
        />
      ))}
    </div>
  </div>
);

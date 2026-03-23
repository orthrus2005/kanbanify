import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

export const AddTaskForm = ({ onAdd }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!title.trim()) return;

    onAdd(title.trim());
    setTitle('');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-500 transition hover:bg-slate-100/80 hover:text-slate-800"
      >
        <Plus size={16} />
        Добавить карточку
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm">
      <textarea
        autoFocus
        rows={3}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            handleSubmit(event);
          }
        }}
        placeholder="Что нужно сделать?"
        className="mb-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />

      <div className="flex items-center gap-2">
        <button type="submit" className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
          Добавить
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setTitle('');
          }}
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Отменить"
        >
          <X size={18} />
        </button>
      </div>
    </form>
  );
};

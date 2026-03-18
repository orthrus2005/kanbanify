import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

export const AddTaskForm = ({ onAdd }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim()) {
      onAdd(title);
      setTitle('');
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button 
        onClick={() => setIsEditing(true)}
        className="mt-2 flex items-center gap-2 w-full p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium"
      >
        <Plus size={16} /> Добавить задачу
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 bg-white p-3 rounded-lg shadow-sm border border-red-200 ring-1 ring-red-100">
      <textarea
        autoFocus
        placeholder="Что нужно сделать?"
        className="w-full text-sm outline-none resize-none border-none focus:ring-0 p-0 mb-2"
        rows={2}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            handleSubmit(e);
          }
        }}
      />
      <div className="flex items-center gap-2">
        <button 
          type="submit"
          className="bg-red-500 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-600 transition-all shadow-sm"
        >
          Добавить
        </button>
        <button 
          type="button" 
          onClick={() => setIsEditing(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </form>
  );
};
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from '../../task/ui/TaskCard';
import { useBoardStore } from '../../board/model/store';
import { useConfirmStore } from '../../../shared/model/confirmStore';

export const Column = ({ column, tasks }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const { addTask, deleteColumn } = useBoardStore();
  const requestConfirm = useConfirmStore((s) => s.requestConfirm);

  const handleDeleteColumn = async () => {
    const ok = await requestConfirm({
      title: 'Удалить колонку',
      message: `Удалить колонку "${column.title}"?`,
    });
    if (ok) deleteColumn(column.id);
  };

  return (
    <div className="flex flex-col w-80 shrink-0 h-fit bg-gray-100/50 p-3 rounded-2xl border border-gray-100 group">
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="font-bold text-gray-600 text-xs uppercase tracking-widest">{column.title}</h3>
        <button onClick={handleDeleteColumn} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">✕</button>
      </div>
      
      <div ref={setNodeRef} className={`flex flex-col gap-3 min-h-[50px] transition-colors ${isOver ? 'bg-red-50/50 rounded-xl' : ''}`}>
        {tasks.map(t => <TaskCard key={t.id} task={t} />)}
      </div>

      <button 
        onClick={() => { const t = prompt("Название задачи:"); if(t) addTask(column.id, t); }} 
        className="mt-4 w-full py-2 text-sm text-gray-400 hover:text-red-500 font-bold transition-all"
      >
        + Добавить задачу
      </button>
    </div>
  );
};
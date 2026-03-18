import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { TaskCard } from '../../task/ui/TaskCard';
import { AddTaskForm } from '../../task/create/ui/AddTaskForm';
import { useBoardStore } from '../../board/model/store';

export const Column = ({ column, tasks }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const addTask = useBoardStore((state) => state.addTask);

  return (
    <div className="kb-column flex flex-col w-80 shrink-0 h-fit max-h-full">
      <div className="flex justify-between items-center mb-5 px-1">
        <h3 className="font-bold text-gray-700 text-sm tracking-tight">{column.title}</h3>
        <span className="bg-white/80 text-gray-400 text-[11px] px-2 py-0.5 rounded-full border border-gray-100 font-bold shadow-sm">
          {tasks.length}
        </span>
      </div>
      
      <div 
        ref={setNodeRef} 
        className={`kb-dropzone flex-1 flex flex-col gap-3 min-h-[50px] ${isOver ? 'kb-dropzone--over' : ''}`}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 ? (
          <div className="kb-empty">
            Перетащи задачу сюда или добавь новую ↓
          </div>
        ) : null}
      </div>

      <div className="mt-2">
        <AddTaskForm onAdd={(title) => addTask(column.id, title)} />
      </div>
    </div>
  );
};
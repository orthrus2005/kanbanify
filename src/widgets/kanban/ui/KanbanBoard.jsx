import React, { useState } from 'react';
import { DndContext, closestCorners, PointerSensor, TouchSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { useBoardStore } from '../../../entities/board/model/store';
import { Column } from '../../../entities/column/ui/Column';
import { TaskCard } from '../../../entities/task/ui/TaskCard';

export const KanbanBoard = () => {
  // Убедитесь, что все функции ниже есть в store.js!
  const { columns, tasks, currentBoardId, moveTask, addColumn } = useBoardStore();
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 5 } })
  );

  const handleDragStart = (e) => {
    const task = tasks.find(t => t.id === e.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    setActiveTask(null);
    if (over && active.id !== over.id) {
      // Если бросили на колонку или на другую задачу в колонке
      const targetColId = columns.some(c => c.id === over.id) 
        ? over.id 
        : tasks.find(t => t.id === over.id)?.column_id;

      if (targetColId) {
        moveTask(active.id, targetColId);
      }
    }
  };

  const onAddColumn = () => {
    const title = prompt("Название новой колонки:");
    if (title && title.trim()) {
      addColumn(currentBoardId, title);
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 p-6 overflow-x-auto custom-scrollbar items-start h-[calc(100dvh-64px)]">
        {columns.map((column) => (
          <Column 
            key={column.id} 
            column={column} 
            tasks={tasks.filter(t => t.column_id === column.id)} 
          />
        ))}
        
        <button 
          onClick={onAddColumn}
          className="flex-shrink-0 w-80 h-14 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500 flex items-center justify-center font-bold transition-all"
        >
          + Добавить колонку
        </button>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
};
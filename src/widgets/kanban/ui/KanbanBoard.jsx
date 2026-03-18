import React, { useState } from 'react';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { useBoardStore } from '../../../entities/board/model/store';
import { Column } from '../../../entities/column/ui/Column';
import { TaskCard } from '../../../entities/task/ui/TaskCard';

export const KanbanBoard = () => {
  const { columns, tasks, currentBoardId, moveTask, addColumn } = useBoardStore();
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (e) => {
    const task = tasks.find(t => t.id === e.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    setActiveTask(null);
    if (over && active.id !== over.id) {
      const isColumn = columns.some(col => col.id === over.id);
      if (isColumn) {
        moveTask(active.id, over.id);
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
      <div className="kb-board flex gap-6 p-6 overflow-x-auto custom-scrollbar items-start h-[calc(100vh-64px)]">
        {columns.map((column) => (
          <Column 
            key={column.id} 
            column={column} 
            tasks={tasks.filter(t => t.column_id === column.id)} 
          />
        ))}
        
        <button 
          onClick={onAddColumn}
          className="kb-add-column flex-shrink-0 w-80 h-14 rounded-2xl flex items-center justify-center font-bold"
        >
          + Добавить колонку
        </button>
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
};
import React, { useState } from 'react';
import { 
  DndContext, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import { useBoardStore } from '../../../entities/board/model/store';
import { Column } from '../../../entities/column/ui/Column';
import { TaskCard } from '../../../entities/task/ui/TaskCard';

export const KanbanBoard = () => {
  const { columns, tasks, currentBoardId, moveTask, addColumn } = useBoardStore();
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const isColumn = columns.some(col => col.id === over.id);
    if (isColumn && active.id) {
       moveTask(active.id, over.id);
    }
  };

  const handleAddColumn = () => {
    const title = prompt("Введите название новой колонки:");
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
      <div className="flex gap-6 p-6 overflow-x-auto custom-scrollbar items-start h-[calc(100vh-64px)] bg-gray-50/50">
        {columns.map((column) => (
          <Column 
            key={column.id} 
            column={column} 
            tasks={tasks.filter((t) => t.column_id === column.id)} 
          />
        ))}
        
        {/* КНОПКА СОЗДАНИЯ */}
        <button 
          onClick={handleAddColumn}
          className="flex-shrink-0 w-80 h-14 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 hover:border-red-400 hover:text-red-500 hover:bg-white transition-all flex items-center justify-center font-bold gap-2 group"
        >
          <span className="text-xl group-hover:scale-125 transition-transform">+</span>
          Новая колонка
        </button>
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-3 shadow-2xl">
            <TaskCard task={activeTask} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
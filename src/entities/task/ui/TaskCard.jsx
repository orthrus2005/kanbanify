import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export const TaskCard = ({ task, isOverlay = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: task.id,
  });

  const style = {
    transform: isOverlay ? undefined : CSS.Translate.toString(transform),
    opacity: isDragging && !isOverlay ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      className={`
        kb-card
        ${isDragging && !isOverlay ? 'kb-card--dragging' : ''}
        ${isOverlay ? 'kb-card--overlay' : ''}
      `}
    >
      <h4 className="text-sm font-semibold text-gray-800 leading-snug">
        {task.title}
      </h4>
      {task.description && (
        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <div className="w-6 h-1 rounded-full bg-gray-100 group-hover:bg-red-100" />
        <span className="text-[10px] text-gray-300 font-mono">
          {task.id.slice(0, 8)}
        </span>
      </div>
    </div>
  );
};
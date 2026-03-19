import React, { useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useBoardStore } from '../../board/model/store';
import { useConfirmStore } from '../../../shared/model/confirmStore';

export const TaskCard = ({ task, isOverlay = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { updateTask, deleteTask, archiveTask } = useBoardStore();
  const requestConfirm = useConfirmStore((s) => s.requestConfirm);

  const [edit, setEdit] = useState({ 
    title: task.title, 
    desc: task.description || '', 
    date: task.due_date?.slice(0,16) || '' 
  });

  const dragFlagRef = useRef(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: isMenuOpen || isModalOpen // Важно: отключаем драг при открытых окнах
  });

  useEffect(() => {
    if (isDragging) dragFlagRef.current = true;
  }, [isDragging]);

  const openEditModal = () => {
    // If click was triggered right after dragging, ignore it.
    if (dragFlagRef.current) {
      dragFlagRef.current = false;
      return;
    }
    setIsModalOpen(true);
  };

  const style = { transform: isOverlay ? undefined : CSS.Translate.toString(transform), opacity: isDragging && !isOverlay ? 0.3 : 1 };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        onClick={openEditModal}
        className={`kb-card group relative cursor-pointer bg-white p-3 rounded-xl shadow-sm border border-transparent hover:border-red-200 transition-all ${isOverlay ? 'rotate-2 shadow-2xl' : ''}`}
      >
        {!isOverlay && (
          <div className="absolute top-2 left-2 z-20">
            <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className="p-1 rounded hover:bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
            {isMenuOpen && (
              <div className="absolute top-6 left-0 w-36 bg-white shadow-xl border rounded-lg py-1 z-30">
                <button onClick={(e) => { e.stopPropagation(); archiveTask(task.id); }} className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex gap-2">📥 В архив</button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const ok = await requestConfirm({ title: 'Удалить задачу', message: 'Удалить задачу?' });
                    if (ok) {
                      deleteTask(task.id);
                      setIsMenuOpen(false);
                    }
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 flex gap-2 font-bold"
                >
                  🗑️ Удалить
                </button>
              </div>
            )}
          </div>
        )}

        <div {...(isOverlay ? {} : listeners)} {...(isOverlay ? {} : attributes)} className={isOverlay ? '' : 'kb-dnd-handle'}>
          <h4 className="text-sm font-semibold pl-6 pr-2 text-gray-800">{task.title}</h4>
          {task.due_date && <div className="mt-2 ml-6 text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded-full w-fit">🕒 {new Date(task.due_date).toLocaleDateString()}</div>}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center"><h3 className="font-bold">Редактировать задачу</h3><button onClick={() => setIsModalOpen(false)}>✕</button></div>
            <div className="p-6 space-y-4">
              <input className="w-full p-3 bg-gray-50 border rounded-xl outline-none" value={edit.title} onChange={e => setEdit({...edit, title: e.target.value})} placeholder="Название"/>
              <textarea className="w-full p-3 bg-gray-50 border rounded-xl outline-none resize-none" rows="4" value={edit.desc} onChange={e => setEdit({...edit, desc: e.target.value})} placeholder="Описание..."/>
              <input type="datetime-local" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" value={edit.date} onChange={e => setEdit({...edit, date: e.target.value})}/>
            </div>
            <div className="p-6 border-t flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => { updateTask(task.id, { title: edit.title, description: edit.desc, due_date: edit.date || null }); setIsModalOpen(false); }} className="px-8 py-2 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-200">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
import React from 'react';
import { useConfirmStore } from '../model/confirmStore';

export const ConfirmDialog = () => {
  const { isOpen, title, message, confirmYes, confirmNo } = useConfirmStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={confirmNo}
      />
      <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <div className="font-extrabold text-gray-900">{title}</div>
          {message ? <div className="text-sm text-gray-600 mt-2">{message}</div> : null}
        </div>

        <div className="p-4 flex gap-3 justify-end">
          <button
            onClick={confirmNo}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={confirmYes}
            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
          >
            Да
          </button>
        </div>
      </div>
    </div>
  );
};


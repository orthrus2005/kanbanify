import React from 'react';

export const InboxWorkspacePanel = ({ children }) => (
  <aside className="relative z-[2] flex h-full min-h-0 w-[356px] min-w-[356px] self-stretch overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(15,23,42,0.1))] p-[10px] shadow-[0_22px_52px_rgba(15,23,42,0.18)]">
    <div className="flex h-full min-h-0 w-full min-w-0 overflow-hidden rounded-[24px]">
      {children}
    </div>
  </aside>
);

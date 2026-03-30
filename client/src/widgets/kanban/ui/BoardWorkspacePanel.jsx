import React from 'react';

export const BoardWorkspacePanel = ({ children }) => (
  <section className="kb-board-workspace flex h-full min-h-0 flex-1 self-stretch overflow-hidden rounded-[30px] border border-white/12 shadow-[0_22px_52px_rgba(15,23,42,0.18)]">
    <div className="custom-scrollbar flex-1 overflow-auto px-3 py-3 sm:px-5 sm:py-5">
      <div className="flex min-h-full min-w-max items-start gap-3 sm:gap-5">{children}</div>
    </div>
  </section>
);

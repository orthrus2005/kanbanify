import React from 'react';

export const PlannerWorkspacePanel = ({ children, className = '' }) => (
  <section
    className={`flex h-full min-h-0 w-[720px] min-w-[620px] self-stretch overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,23,39,0.24),rgba(15,23,42,0.12))] shadow-[0_22px_52px_rgba(15,23,42,0.18)] ${className}`}
  >
    {children}
  </section>
);

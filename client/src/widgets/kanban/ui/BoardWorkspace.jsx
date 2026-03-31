import React from 'react';
import { BoardWorkspacePanel } from './BoardWorkspacePanel';

export const BoardWorkspace = ({ header = null, children }) => <BoardWorkspacePanel header={header}>{children}</BoardWorkspacePanel>;

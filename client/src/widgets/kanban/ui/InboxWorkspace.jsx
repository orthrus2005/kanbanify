import React from 'react';
import { InboxColumn } from '../../../entities/inbox/ui/InboxColumn';
import { InboxWorkspacePanel } from './InboxWorkspacePanel';

export const InboxWorkspace = () => (
  <InboxWorkspacePanel>
    <InboxColumn contained />
  </InboxWorkspacePanel>
);

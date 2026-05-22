import React from 'react';
import { TyreAppProvider, useTyreApp } from '../tyre-intelligence/App';
import { IndentDashboard } from '../tyre-intelligence/components/IndentDashboard';

const TyreIndentsPageContent: React.FC = () => {
  const {
    indents,
    currentUser,
    approveIndent,
    rejectIndent,
    markIndentOrdered,
    markIndentReceived
  } = useTyreApp();

  return (
    <IndentDashboard
      indents={indents}
      onApprove={approveIndent}
      onReject={rejectIndent}
      onMarkOrdered={markIndentOrdered}
      onMarkReceived={markIndentReceived}
      currentUser={currentUser}
    />
  );
};

export const TyreIndentsPage: React.FC = () => {
  return (
    <TyreAppProvider>
      <TyreIndentsPageContent />
    </TyreAppProvider>
  );
};

import React from 'react';
import { TyreAppProvider, useTyreApp } from '../tyre-intelligence/App';
import { JobCardBoard } from '../tyre-intelligence/components/JobCardBoard';
import { JobStatus } from '../tyre-intelligence/types';

const TyreJobsContent: React.FC = () => {
  const { jobCards, setJobCards, currentUser } = useTyreApp();

  const handleIssueStock = (jobCardId: string) => {
    setJobCards(prev =>
      prev.map(jc => jc.id === jobCardId ? { ...jc, status: JobStatus.IN_PROGRESS } : jc)
    );
  };

  const handleCompleteJob = (jobCardId: string) => {
    setJobCards(prev =>
      prev.map(jc => jc.id === jobCardId ? { ...jc, status: JobStatus.COMPLETED } : jc)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <JobCardBoard
        jobCards={jobCards}
        onIssueStock={handleIssueStock}
        onCompleteJob={handleCompleteJob}
        userRole={currentUser.role}
      />
    </div>
  );
};

export const TyreJobsPage: React.FC = () => {
  return (
    <TyreAppProvider>
      <TyreJobsContent />
    </TyreAppProvider>
  );
};

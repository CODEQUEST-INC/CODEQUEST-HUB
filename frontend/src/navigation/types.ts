import { ProposalResponse } from '../api/proposals';
import { TaskResponse } from '../api/tasks';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Group: undefined;
  Proposal: undefined;
  ReviewQueue: undefined;
  Tasks: undefined;
  Judge: undefined;
  Leaderboard: undefined;
  Admin: undefined;
};

export type ProposalStackParamList = {
  ProposalStatus: undefined;
  ProposalForm: { mode: 'submit' } | { mode: 'resubmit'; proposal: ProposalResponse };
  ProposalHistory: { proposalId: string };
};

export type SupervisorStackParamList = {
  ReviewQueue: undefined;
  ReviewDetail: { proposal: ProposalResponse };
};

export type TaskStackParamList = {
  TaskBoard: undefined;
  TaskForm: { mode: 'create' } | { mode: 'edit'; task: TaskResponse };
};

export type AdminStackParamList = {
  AdminHub: undefined;
  Criteria: undefined;
  Judges: undefined;
  Leaderboard: undefined;
};

import { ProposalResponse } from '../api/proposals';
import { ShowcaseEntryResponse } from '../api/showcase';
import { TaskResponse } from '../api/tasks';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Profile: undefined;
  Help: undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Group: undefined;
  Proposal: undefined;
  Tasks: undefined;
  Judge: undefined;
  Leaderboard: undefined;
  Showcase: undefined;
};

export type ProposalStackParamList = {
  ProposalStatus: undefined;
  ProposalForm: { mode: 'submit' } | { mode: 'resubmit'; proposal: ProposalResponse };
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
  Cohorts: undefined;
  Groups: undefined;
  Criteria: undefined;
  Judges: undefined;
  Leaderboard: undefined;
  Payments: undefined;
  Users: undefined;
};

export type ShowcaseStackParamList = {
  ShowcaseGallery: undefined;
  ShowcaseDetail: { entry: ShowcaseEntryResponse };
  ShowcaseEdit: undefined;
};

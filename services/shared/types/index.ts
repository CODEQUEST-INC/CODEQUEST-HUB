// Shared types used across all CodeQuestHub microservices.
// Import via relative path until this is published as an internal package,
// e.g. import { UserRole } from '../../shared/types';

export type UserRole = 'student' | 'supervisor' | 'admin' | 'mentor';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

// Augments Express's Request type so req.user is typed after the auth middleware runs.
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  studentId?: string | null;
  indexNumber?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  cohortId: string;
  groupNumber: number;
  name?: string | null;
  supervisorId?: string | null;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  joinedAt: string;
}

export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'forwarded_to_admin';

export interface Proposal {
  id: string;
  groupId: string;
  title: string;
  problemStatement: string;
  objectives: string;
  techStack: string;
  documentUrl?: string | null;
  documentName?: string | null;
  status: ProposalStatus;
  currentVersion: number;
  submittedBy: string;
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalVersion {
  id: string;
  proposalId: string;
  versionNumber: number;
  title: string;
  problemStatement: string;
  objectives: string;
  techStack: string;
  documentUrl?: string | null;
  documentName?: string | null;
  action: string;
  actorId: string;
  feedback?: string | null;
  createdAt: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  data: T;
}

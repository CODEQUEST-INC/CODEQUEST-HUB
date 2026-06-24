// Shared types used across all CodeQuestHub microservices.
// Import via relative path until this is published as an internal package,
// e.g. import { UserRole } from '../../shared/types';

export type UserRole = 'student' | 'supervisor' | 'admin' | 'mentor' | 'alumni' | 'senior';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  profileCompleted?: boolean;
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
  profileCompleted: boolean;
  avatarUrl?: string | null;
  bio?: string | null;
  socialLinks?: Record<string, string>;
  skills?: string[];
  mentorshipStatus?: boolean;
  subaccountId?: string | null;
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

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export interface Task {
  id: string;
  groupId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberContribution {
  userId: string;
  fullName: string;
  tasksCompleted: number;
}

export interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  memberContributions: MemberContribution[];
}

// ============================================================
// Phase 4: Community & Resources
// ============================================================

export type PostCategory = 'discussion' | 'tutorial' | 'help' | 'announcement';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  category: PostCategory;
  linkUrl?: string | null;
  isPromoted?: boolean;
  createdAt: string;
}

export type ResourceType = 'hall_of_fame' | 'material';

export interface Resource {
  id: string;
  title: string;
  description: string;
  resourceType: ResourceType;
  linkUrl?: string | null;
  thumbnailUrl?: string | null;
  cohortId?: string | null;
  uploadedBy: string;
  isPremium?: boolean;
  price?: number | null;
  createdAt: string;
}

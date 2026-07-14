import { request } from './client';

export type ProposalStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'changes_requested';

export interface ProposalContentRequest {
  title: string;
  problemStatement: string;
  objectives: string;
  techStack: string;
}

export interface ProposalResponse extends ProposalContentRequest {
  id: string;
  groupId: string;
  status: ProposalStatus;
  currentVersion: number;
  submittedBy: string;
  reviewedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalVersionResponse extends ProposalContentRequest {
  id: string;
  proposalId: string;
  versionNumber: number;
  action: string;
  actorId: string;
  feedback: string | null;
  createdAt: string;
}

export interface ProposalHistoryResponse {
  proposalId: string;
  totalVersions: number;
  history: ProposalVersionResponse[];
}

export type ReviewAction = 'approved' | 'rejected' | 'changes_requested';

export interface ReviewRequest {
  action: ReviewAction;
  feedback?: string;
}

export function submitProposal(req: ProposalContentRequest, token: string): Promise<ProposalResponse> {
  return request<ProposalResponse>('/api/proposals', { method: 'POST', body: req, token });
}

export function getMyProposal(token: string): Promise<ProposalResponse> {
  return request<ProposalResponse>('/api/proposals/my', { token });
}

export function resubmitProposal(
  proposalId: string,
  req: ProposalContentRequest,
  token: string
): Promise<ProposalResponse> {
  return request<ProposalResponse>(`/api/proposals/${proposalId}/resubmit`, {
    method: 'PATCH',
    body: req,
    token,
  });
}

export function reviewProposal(
  proposalId: string,
  req: ReviewRequest,
  token: string
): Promise<ProposalResponse> {
  return request<ProposalResponse>(`/api/proposals/${proposalId}/review`, {
    method: 'PATCH',
    body: req,
    token,
  });
}

export function getSupervisorProposals(token: string): Promise<ProposalResponse[]> {
  return request<ProposalResponse[]>('/api/proposals/supervisor', { token });
}

export function getProposalHistory(proposalId: string, token: string): Promise<ProposalHistoryResponse> {
  return request<ProposalHistoryResponse>(`/api/proposals/${proposalId}/history`, { token });
}

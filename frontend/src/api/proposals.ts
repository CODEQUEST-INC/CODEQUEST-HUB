import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';
import { ApiError, request } from './client';

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
  pdfUrl: string | null;
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
  pdfUrl: string | null;
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

export interface ProposalPdfFile {
  uri: string;
  name: string;
  type: string;
}

export function resolveProposalPdfUrl(pdfUrl: string | null): string | null {
  return pdfUrl ? `${API_BASE_URL}${pdfUrl}` : null;
}

// Multipart because a PDF attachment is required alongside the text fields —
// can't go through client.ts's request(), which always JSON-stringifies.
async function submitMultipart(
  path: string,
  method: 'POST' | 'PATCH',
  req: ProposalContentRequest,
  pdf: ProposalPdfFile,
  token: string
): Promise<ProposalResponse> {
  const formData = new FormData();
  formData.append('title', req.title);
  formData.append('problemStatement', req.problemStatement);
  formData.append('objectives', req.objectives);
  formData.append('techStack', req.techStack);

  if (Platform.OS === 'web') {
    // On web, expo-document-picker's uri is a blob: URL and FormData is the
    // browser's real implementation — it needs an actual Blob, not the
    // {uri, name, type} object RN's own FormData polyfill understands.
    const blob = await fetch(pdf.uri).then((r) => r.blob());
    formData.append('file', new Blob([blob], { type: pdf.type }), pdf.name);
  } else {
    formData.append('file', pdf as unknown as Blob);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const message = json?.message ?? json?.error ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return json?.data as ProposalResponse;
}

export function submitProposal(
  req: ProposalContentRequest,
  pdf: ProposalPdfFile,
  token: string
): Promise<ProposalResponse> {
  return submitMultipart('/api/proposals', 'POST', req, pdf, token);
}

export function getMyProposal(token: string): Promise<ProposalResponse> {
  return request<ProposalResponse>('/api/proposals/my', { token });
}

export function resubmitProposal(
  proposalId: string,
  req: ProposalContentRequest,
  pdf: ProposalPdfFile,
  token: string
): Promise<ProposalResponse> {
  return submitMultipart(`/api/proposals/${proposalId}/resubmit`, 'PATCH', req, pdf, token);
}

export function withdrawProposal(proposalId: string, token: string): Promise<ProposalResponse> {
  return request<ProposalResponse>(`/api/proposals/${proposalId}/withdraw`, { method: 'PATCH', token });
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

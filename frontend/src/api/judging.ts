import { ApiError, request } from './client';

export interface JudgingCriterion {
  id: string;
  cohortId: string;
  name: string;
  weight: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Judge {
  id: string;
  cohortId: string;
  userId: string;
  createdAt: string;
}

export interface ScoreEntry {
  criterionId: string;
  score: number;
}

export interface ScorecardScoreResponse {
  id: string;
  criterionId: string;
  score: number;
}

export interface Scorecard {
  id: string;
  groupId: string;
  judgeId: string;
  submittedAt: string;
  updatedAt: string;
  comment: string | null;
  scores: ScorecardScoreResponse[];
}

export interface LeaderboardEntry {
  groupId: string;
  groupName: string | null;
  groupNumber: number;
  groupPhotoUrl: string | null;
  averageScore: number | null;
  judgeCount: number;
}

export interface LeaderboardResponse {
  published: boolean;
  publishedAt: string | null;
  entries: LeaderboardEntry[];
}

export interface CreateCriterionRequest {
  cohortId: string;
  name: string;
  weight: number;
}

export interface UpdateCriterionRequest {
  name: string;
  weight: number;
  active: boolean;
}

export function listCriteria(cohortId: string, token: string): Promise<JudgingCriterion[]> {
  return request<JudgingCriterion[]>(`/api/judging/criteria?cohortId=${cohortId}`, { token });
}

export function createCriterion(req: CreateCriterionRequest, token: string): Promise<JudgingCriterion> {
  return request<JudgingCriterion>('/api/judging/criteria', { method: 'POST', body: req, token });
}

export function updateCriterion(
  criterionId: string,
  req: UpdateCriterionRequest,
  token: string
): Promise<JudgingCriterion> {
  return request<JudgingCriterion>(`/api/judging/criteria/${criterionId}`, { method: 'PATCH', body: req, token });
}

export function deleteCriterion(criterionId: string, token: string): Promise<void> {
  return request<void>(`/api/judging/criteria/${criterionId}`, { method: 'DELETE', token });
}

export function assignJudge(cohortId: string, userId: string, token: string): Promise<Judge> {
  return request<Judge>('/api/judging/judges', { method: 'POST', body: { cohortId, userId }, token });
}

export function listJudges(cohortId: string, token: string): Promise<Judge[]> {
  return request<Judge[]>(`/api/judging/judges?cohortId=${cohortId}`, { token });
}

export function removeJudge(judgeAssignmentId: string, token: string): Promise<void> {
  return request<void>(`/api/judging/judges/${judgeAssignmentId}`, { method: 'DELETE', token });
}

export function submitScorecard(
  groupId: string,
  scores: ScoreEntry[],
  token: string,
  comment?: string
): Promise<Scorecard> {
  return request<Scorecard>('/api/judging/scorecards', {
    method: 'POST',
    body: { groupId, scores, comment: comment || undefined },
    token,
  });
}

export async function getMyScorecard(groupId: string, token: string): Promise<Scorecard | null> {
  try {
    return await request<Scorecard>(`/api/judging/scorecards/my?groupId=${groupId}`, { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

// Admin-only — individual judge scores for one group (leaderboard shows the
// cohort's aggregate; this backs the "who scored this and how" drill-down).
export function getScorecardsForGroup(groupId: string, token: string): Promise<Scorecard[]> {
  return request<Scorecard[]>(`/api/judging/scorecards/group/${groupId}`, { token });
}

export function getLeaderboard(cohortId: string, token: string): Promise<LeaderboardResponse> {
  return request<LeaderboardResponse>(`/api/judging/leaderboard?cohortId=${cohortId}`, { token });
}

export function publishLeaderboard(cohortId: string, token: string): Promise<void> {
  return request<void>(`/api/judging/leaderboard/publish?cohortId=${cohortId}`, { method: 'POST', token });
}

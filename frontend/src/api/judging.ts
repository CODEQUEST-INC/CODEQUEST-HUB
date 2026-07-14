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
  scores: ScorecardScoreResponse[];
}

export interface LeaderboardEntry {
  groupId: string;
  groupName: string | null;
  groupNumber: number;
  averageScore: number | null;
  judgeCount: number;
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
  token: string
): Promise<Scorecard> {
  return request<Scorecard>('/api/judging/scorecards', { method: 'POST', body: { groupId, scores }, token });
}

export async function getMyScorecard(groupId: string, token: string): Promise<Scorecard | null> {
  try {
    return await request<Scorecard>(`/api/judging/scorecards/my?groupId=${groupId}`, { token });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export function getLeaderboard(cohortId: string, token: string): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>(`/api/judging/leaderboard?cohortId=${cohortId}`, { token });
}

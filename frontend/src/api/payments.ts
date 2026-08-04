import { request } from './client';

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface PaymentFeeConfig {
  id: string;
  cohortId: string;
  amountPesewas: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  groupId: string;
  amountPesewas: number;
  currency: string;
  shirtSize: string;
  paystackReference: string;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberPaymentStatus {
  userId: string;
  status: PaymentStatus | 'unpaid';
  shirtSize: string | null;
}

export interface GroupPaymentSummary {
  groupId: string;
  totalMembers: number;
  paidCount: number;
  allPaid: boolean;
  members: MemberPaymentStatus[];
}

export interface CohortGroupPaymentSummary extends GroupPaymentSummary {
  groupNumber: number;
  groupName: string | null;
}

export interface InitializePaymentResult {
  authorizationUrl: string;
  reference: string;
}

export function getFeeConfig(cohortId: string, token: string): Promise<PaymentFeeConfig> {
  return request<PaymentFeeConfig>(`/api/payments/fee-config?cohortId=${cohortId}`, { token });
}

export function setFeeConfig(cohortId: string, amountPesewas: number, token: string): Promise<PaymentFeeConfig> {
  return request<PaymentFeeConfig>('/api/payments/fee-config', {
    method: 'PATCH',
    body: { cohortId, amountPesewas },
    token,
  });
}

export function getCohortPaymentStatuses(cohortId: string, token: string): Promise<CohortGroupPaymentSummary[]> {
  return request<CohortGroupPaymentSummary[]>(`/api/payments/cohort/${cohortId}`, { token });
}

export function initializePayment(
  groupId: string,
  shirtSize: string,
  token: string
): Promise<InitializePaymentResult> {
  return request<InitializePaymentResult>('/api/payments/initialize', {
    method: 'POST',
    body: { groupId, shirtSize },
    token,
  });
}

export function verifyPayment(reference: string, token: string): Promise<PaymentRecord> {
  return request<PaymentRecord>(`/api/payments/verify/${reference}`, { token });
}

export function getMyPaymentStatus(groupId: string, token: string): Promise<PaymentRecord | null> {
  return request<PaymentRecord | null>(`/api/payments/mine/${groupId}`, { token });
}

export function getGroupPaymentSummary(groupId: string, token: string): Promise<GroupPaymentSummary> {
  return request<GroupPaymentSummary>(`/api/payments/group/${groupId}/summary`, { token });
}

export function getMyPaymentHistory(groupId: string, token: string): Promise<PaymentRecord[]> {
  return request<PaymentRecord[]>(`/api/payments/mine/${groupId}/history`, { token });
}

export function remindUnpaidMembers(groupId: string, token: string): Promise<{ remindedCount: number }> {
  return request<{ remindedCount: number }>(`/api/payments/group/${groupId}/remind`, { method: 'POST', token });
}

export interface PaymentSummary {
  collectedPesewas: number;
  expectedPesewas: number;
  outstandingCount: number;
}

export function getAdminPaymentSummary(token: string): Promise<PaymentSummary> {
  return request<PaymentSummary>('/api/payments/admin/summary', { token });
}

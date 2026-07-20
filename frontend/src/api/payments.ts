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

export interface GroupPaymentStatus {
  groupId: string;
  groupNumber: number;
  groupName: string | null;
  status: PaymentStatus | 'unpaid';
  amountPesewas: number | null;
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

export function getCohortPaymentStatuses(cohortId: string, token: string): Promise<GroupPaymentStatus[]> {
  return request<GroupPaymentStatus[]>(`/api/payments/cohort/${cohortId}`, { token });
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

export function getGroupPaymentStatus(groupId: string, token: string): Promise<PaymentRecord | null> {
  return request<PaymentRecord | null>(`/api/payments/group/${groupId}`, { token });
}

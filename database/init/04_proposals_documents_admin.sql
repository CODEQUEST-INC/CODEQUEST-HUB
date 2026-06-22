-- Migration 004: Proposal Documents and Admin Forwarding
-- CodeQuestHub MVP — Phase 2 Backend Updates

-- 1. Add the new 'forwarded_to_admin' status
ALTER TYPE proposal_status ADD VALUE IF NOT EXISTS 'forwarded_to_admin';

-- 2. Add document storage fields to the active proposals table
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS document_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);

-- 3. Add document storage fields to the proposal_versions history table
ALTER TABLE proposal_versions 
ADD COLUMN IF NOT EXISTS document_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS document_name VARCHAR(255);

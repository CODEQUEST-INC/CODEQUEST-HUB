CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,          -- 'PROPOSAL_PENDING', 'PROPOSAL_APPROVED', 'PROPOSAL_REJECTED'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_id UUID,             -- links back to the proposal id
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
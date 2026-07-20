-- Migration 013: Payments
-- CodeQuestHub — flat per-student registration fee via Paystack

CREATE TABLE payment_fee_configs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id       UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    amount_pesewas  INTEGER NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'GHS',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_payment_fee_configs_cohort ON payment_fee_configs(cohort_id);

CREATE TRIGGER trg_payment_fee_configs_updated_at
    BEFORE UPDATE ON payment_fee_configs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed');

CREATE TABLE payment_records (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id            UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    amount_pesewas      INTEGER NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'GHS',
    shirt_size          VARCHAR(10) NOT NULL,
    paystack_reference  VARCHAR(100) NOT NULL UNIQUE,
    status              payment_status NOT NULL DEFAULT 'pending',
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_records_group ON payment_records(group_id);
CREATE INDEX idx_payment_records_status ON payment_records(status);

CREATE TRIGGER trg_payment_records_updated_at
    BEFORE UPDATE ON payment_records
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

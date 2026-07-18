-- Migration 009: Payment registrations for Paystack-backed t-shirt signup
-- CodeQuestHub MVP — Payment Service
--
-- Stores the all-in-one registration data and the payment lifecycle so the
-- backend can initialize Paystack, verify the transaction, and persist the
-- paid registration.

CREATE TABLE payment_registrations (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name               VARCHAR(150) NOT NULL,
    email                   VARCHAR(150) NOT NULL,
    phone_number            VARCHAR(50) NOT NULL,
    tshirt_size             VARCHAR(20) NOT NULL,
    tshirt_quantity         INT NOT NULL CHECK (tshirt_quantity > 0),
    unit_price_kobo         BIGINT NOT NULL,
    total_amount_kobo       BIGINT NOT NULL,
    reference               VARCHAR(100) NOT NULL UNIQUE,
    authorization_url       VARCHAR(500),
    access_code             VARCHAR(120),
    paystack_transaction_id BIGINT,
    status                  VARCHAR(30) NOT NULL,
    gateway_response        VARCHAR(120),
    verified_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_registrations_email ON payment_registrations(email);
CREATE INDEX idx_payment_registrations_status ON payment_registrations(status);
CREATE INDEX idx_payment_registrations_reference ON payment_registrations(reference);
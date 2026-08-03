-- KYC workflow: status and risk level on users; audit table for submissions.
-- NOT_STARTED -> user has not begun; PENDING = submitted; IN_PROGRESS = backend processing; VERIFIED/REJECTED = final.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW';

COMMENT ON COLUMN users.verification_status IS 'NOT_STARTED | PENDING | IN_PROGRESS | VERIFIED | REJECTED';
COMMENT ON COLUMN users.risk_level IS 'LOW | MEDIUM | HIGH; for payouts and limits';

CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);

-- Audit table for KYC submissions (legal entity, address, ID document session).
CREATE TABLE IF NOT EXISTS organizer_kyc_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    legal_entity_type VARCHAR(20) NOT NULL,
    address_street VARCHAR(255) NOT NULL,
    address_city VARCHAR(100) NOT NULL,
    address_state VARCHAR(50) NOT NULL,
    address_zip VARCHAR(20) NOT NULL,
    id_provider VARCHAR(50),
    id_session_id VARCHAR(255),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizer_kyc_submissions IS 'KYC submissions for organizer verification; OFAC/watchlist checks reference.';
CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON organizer_kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_status ON organizer_kyc_submissions(status);

-- Tax identifiers for 1099-K and US compliance: SSN (last 4) for individuals, EIN for businesses.
ALTER TABLE organizer_kyc_submissions
ADD COLUMN IF NOT EXISTS ssn_last4 VARCHAR(4);

ALTER TABLE organizer_kyc_submissions
ADD COLUMN IF NOT EXISTS ein VARCHAR(20);

COMMENT ON COLUMN organizer_kyc_submissions.ssn_last4 IS 'Last 4 digits of SSN for individuals (1099-K)';
COMMENT ON COLUMN organizer_kyc_submissions.ein IS 'Employer Identification Number for businesses';

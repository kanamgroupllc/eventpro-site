# TODO: Complete Identity Check & Verification

This document tracks remaining work to make the KYC (Know Your Customer) / Complete Identity Check workflow **fully functional** end-to-end. The current implementation collects legal entity + address and submits to the backend; the items below are still required for production-ready verification and payouts.

---

## 1. ID Document Verification (Stripe Identity / Persona)

**Status:** Not started  
**Priority:** High

- [ ] Integrate **Stripe Identity** or **Persona** so users capture a photo of a government-issued ID (driver's license or passport) in-app.
- [ ] Frontend: Add flow to launch the provider's verification (redirect or embedded component) and obtain a **session/verification ID**.
- [ ] Pass that ID in `idSessionId` (and set `idProvider`) when calling `POST /api/v1/organizer/verification`.
- [ ] Backend: Optionally call the provider's API to confirm the session succeeded before marking verification as complete or in progress.

**Notes:** Step 3 of the Identity Check modal is currently a placeholder with an optional "Verification session ID" field. Until this is done, identity is not actually verified—only address and entity type are collected.

---

## 2. Backend Risk Scoring & Processing

**Status:** Partially done  
**Priority:** High

- [x] When a KYC submission is created, set user `verification_status` to **IN_PROGRESS** when processing starts (done in `VerificationServiceImpl.submitVerification`).
- [ ] Implement **OFAC (or other watchlist) check** on name/DOB/address (and ID data when available).
- [ ] Implement **ID verification result** check from Stripe/Persona (if integrated in §1).
- [ ] Store risk-check results (e.g. `watchlist_checked_at`, `watchlist_result`, `id_verification_result`) for audit and to drive VERIFIED/REJECTED decision.
- [ ] Optionally compute or update `user.risk_level` (LOW/MEDIUM/HIGH) based on check results.

**Notes:** Submission is still created as PENDING so admins can list and approve/reject. User sees "Verification in progress" until admin or future automated checks set VERIFIED/REJECTED. Placeholder comment in code for wiring OFAC/ID when integrated.

---

## 3. Approval / Rejection Flow

**Status:** Implemented  
**Priority:** High

- [x] Add **admin API** to list pending KYC submissions: `GET /api/v1/admin/verification-pending?limit=50`.
- [x] Add **approve** action: `POST /api/v1/admin/verification/{submissionId}/approve` — sets submission to VERIFIED, `user.verification_status = 'VERIFIED'`, `user.is_verified = true`.
- [x] Add **reject** action: `POST /api/v1/admin/verification/{submissionId}/reject` with optional body `{ "reason": "..." }` — sets submission to REJECTED, `user.verification_status = 'REJECTED'`, stores `rejection_reason`.
- [ ] Optionally: automated approval path when risk checks (§2) pass; automated rejection when they fail.
- [ ] Optionally: notify the user (email/in-app) when verified or rejected.

**Notes:** Admins can now approve or reject PENDING submissions; Profile already shows REJECTED state and "Resubmit verification".

---

## 4. Bank Account & Payout Readiness

**Status:** Implemented (Stripe Connect)  
**Priority:** High (for real payouts)

- [x] **Collect payout bank account** via Stripe Connect Express onboarding (organizer clicks "Add bank account", redirects to Stripe, returns to app; `stripe_connect_account_id` stored on user).
- [ ] **Name matching:** Optional: compare Stripe Connect account holder to KYC/ID name; reject or flag mismatches.
- [x] **Secure storage** via Stripe Connect (Stripe holds bank details); we store only Connect account ID.
- [x] **Payout execution:** When organizer requests payout and has Connect account, backend creates Stripe Transfer to that account and marks request COMPLETED. `OrganizerSummary.availableBalance` remains computed from orders; transfer uses that balance.

**Notes:** Name matching can be added when needed. Platform must have sufficient Stripe balance to transfer (in test mode, add funds in Dashboard).

---

## 5. Frontend: Rejection & Resubmit UX

**Status:** Implemented  
**Priority:** Medium

- [x] When `verification_status === 'REJECTED'`, show a clear **"Verification declined"** state on the Profile (badge or message). (Web + mobile.)
- [x] Add **"Resubmit"** or **"Complete Identity Check again"** — web reopens Identity Check modal; mobile shows "Resubmit on web" and opens web Profile (API allows resubmit when REJECTED via `canResubmit`).
- [x] If backend returns a **rejection reason** (from admin or risk checks), display a user-friendly message. (Web and mobile show `user.rejectionReason` or `lastRejectionReason` from verification-status API.)

---

## 6. Optional Enhancements

**Status:** Backlog  
**Priority:** Low

- [ ] Email/in-app notification when verification status changes (PENDING → IN_PROGRESS, VERIFIED, REJECTED).
- [ ] Admin UI to review and approve/reject submissions with rejection reason.
- [ ] Retry/backoff for external ID or watchlist provider failures.
- [ ] Audit log for all verification status changes and admin actions.

---

## Reference: Current Implementation

| Component | Location |
|-----------|----------|
| Identity Check modal (steps 1–3 + submit) | `eventpro-frontend/src/components/IdentityCheckModal.tsx` |
| Profile badge + "Complete Identity Check" button | `eventpro-frontend/src/pages/Profile.tsx` |
| Submit API | `POST /api/v1/organizer/verification` |
| Status API | `GET /api/v1/organizer/verification-status` |
| Backend service | `VerificationServiceImpl` (submit + get status) |
| KYC table | `organizer_kyc_submissions` (migration V14) |
| User fields | `users.verification_status`, `users.is_verified`, `users.risk_level` |

---

*Last updated: 2025*

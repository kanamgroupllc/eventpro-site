# Testing Checklist: Team Management, White-Label, API Keys

Use this checklist to verify all implemented flows after running the backend and frontend locally.

---

## Prerequisites

- Backend running (e.g. `./gradlew :services:modules:eventpro-api:bootRun` or via Makefile).
- Frontend running (`npm run dev` in `eventpro-frontend`).
- At least two user accounts (one Pro or Enterprise organizer, one to invite as team member).
- Database migrations V20 (organizer_team_members) and V21 (organizer branding) applied.

---

## 1. API Keys (Enterprise)

- [ ] **Create API key**  
  As an Enterprise user, go to Profile → API keys. Enter a name, click "Create API key". Copy the key from the success message.
- [ ] **List API keys**  
  Confirm the new key appears in the list (prefix + date). Key value is not shown again.
- [ ] **Use X-Api-Key**  
  Call an authenticated endpoint (e.g. `GET /api/v1/users/me` or `GET /api/v1/organizer/events`) with header `X-Api-Key: <paste_key>`. Should return 200 with data.
- [ ] **Revoke API key**  
  Click Revoke on a key. Confirm it no longer works when calling the API with that key (401).

---

## 2. Team Management (Pro/Enterprise)

- [ ] **List team members**  
  As a Pro or Enterprise organizer, open Profile. "Team Management" card shows; initially empty or existing members.
- [ ] **Invite by email**  
  Enter an email of an **existing** user and role (Admin / Editor / Viewer). Click "Add member". User appears in the list.
- [ ] **Update role**  
  Change a member’s role via the dropdown. List updates and toast confirms.
- [ ] **Remove member**  
  Click trash on a member. Confirm dialog; member is removed from the list.
- [ ] **Team member sees events**  
  Log in as the invited user. Go to Organizer dashboard. Events belonging to the **owner** should appear (they can manage those events).
- [ ] **Team member can edit event**  
  As the invited user, open an event owned by the organizer and edit it (e.g. change name). Save. Confirm change persists.
- [ ] **Access denied for Basic**  
  As a Basic user, Team Management card is not shown (or API returns 403 if called directly).

---

## 3. White-Label / Custom Branding (Pro/Enterprise)

- [ ] **Branding form on Profile**  
  As Pro or Enterprise, scroll to "White-Label Branding". Enter a logo URL (e.g. any public image URL), pick a primary color (hex), check "Hide Powered by KanamEvents". Click "Save branding". Toast confirms.
- [ ] **Logo on event page**  
  Open a **published** event owned by that user (e.g. `/events/{id}`). Organizer logo should appear at the top when set.
- [ ] **Primary color**  
  Event page can use the custom primary color (CSS variable `--event-primary` is set). Visually confirm if buttons/accents use it.
- [ ] **Hide platform branding**  
  With "Hide platform branding" enabled, open the same event page. "Powered by KanamEvents" at the bottom should **not** appear. With it disabled, it should appear.

---

## 4. Donations & Custom Domain (existing)

- [ ] **Donations**  
  Create/edit event with "Donations" enabled (Pro/Enterprise). Checkout shows optional donation; complete order; confirm `donation_amount` stored (e.g. in DB or order details).
- [ ] **Custom domain**  
  Set `customDomain` on an event via API or form. Response includes `customDomain`. (DNS/routing not implemented; field is stored and returned.)

---

## 5. Quick regression

- [ ] **Organizer events list**  
  Owner sees their events; team member sees owner’s events they were added to.
- [ ] **Event CRUD**  
  Owner and team member can both update the same event (e.g. name, description).
- [ ] **Attendees / stats**  
  Team member can open event attendees and event stats for owner’s event.
- [ ] **Profile load**  
  Profile loads without error; subscription tier and branding fields display correctly.

---

## Notes

- **Team:** Invite by email only; the user must already have an account. "User not found" means no user with that email.
- **Branding:** Logo URL must be publicly accessible (CORS may affect some URLs). Primary color is applied via inline style on the event page container.
- **API keys:** Stored hashed; only the prefix is shown in the list. Revoking is irreversible.

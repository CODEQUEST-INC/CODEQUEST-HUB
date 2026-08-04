# Backlog

Future work, not yet scheduled or scoped. Items here haven't been designed or
estimated — pull one out and flesh it out before starting it.

## Auth & account

- [ ] **Email verification on registration** — send a confirmation/verification email when a user registers, before (or alongside) granting access. Needs an email-sending capability in `auth-service` (none exists today) plus a verification-token/expiry flow.
- [ ] **Sign up / sign in with Google** — OAuth provider integration alongside the existing email+password flow. Needs backend OAuth handling in `auth-service` and a frontend button on Login/Register.
- [ ] **Forgot password** (accessible from Login, and/or Settings) — no password-reset endpoint exists yet; needs a reset-token email flow similar to verification.
- [ ] **Change password** (Settings) — authenticated password change for a logged-in user; simpler than reset since no email flow is needed, just current-password confirmation.
- [ ] **Auth / validation hardening** — broader pass over auth and input validation across services (scope still needs defining — which endpoints, what's currently weak).

## Settings

- [ ] **Profile picture** — avatar upload for a user's own profile, shown in Settings/Profile. Would follow the same upload pattern already used for group photos and showcase photos (presigned/multipart upload + storage volume).
- [ ] **Help center** — some form of in-app help/support content or contact path, reachable from Settings.

## Showcase

- [ ] **Real-time GitHub progress monitoring** — pull live commit/activity stats from a group's linked GitHub repo (via GitHub API) and surface them, likely on the Showcase or Group screens. Needs a GitHub API integration (auth token handling, rate limits) — not yet scoped.

## Infrastructure

- [ ] **Backend hosting on Render** — move the backend off local Docker Compose to a hosted Render deployment (8 services + Postgres connection). Needs env/secrets setup on Render and a decision on whether all 8 services stay separate or get consolidated.

## Cross-cutting / QA

- [ ] **Everything on screen must be interactive** — audit pass to catch any remaining dead-end UI (elements that look tappable but do nothing, or navigate nowhere). Continues the same principle already applied screen-by-screen in `frontend/UI_UX_CHECKLIST.md` — a few items were *deliberately* left non-interactive this session (Login's "Forgot password?", Dashboard's notification bell, Group Workspace's payment-method chips) specifically because they had no backing feature; this item is the reminder to revisit those once the backing features above land.

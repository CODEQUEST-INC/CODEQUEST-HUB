# Backlog

Future work, not yet scheduled or scoped. Items here haven't been designed or
estimated — pull one out and flesh it out before starting it.

## Auth & account

- [ ] **Email verification on registration** — send a confirmation/verification email when a user registers, before (or alongside) granting access. Needs an email-sending capability in `auth-service` (none exists today) plus a verification-token/expiry flow.
- [ ] **Sign up / sign in with Google** — OAuth provider integration alongside the existing email+password flow. Needs backend OAuth handling in `auth-service` and a frontend button on Login/Register.
- [x] **Forgot password** — done. Reset-token flow in `auth-service` (email stubbed), `ForgotPasswordScreen` reachable from Login.
- [x] **Change password** (Settings) — done. `ChangePasswordScreen`, reachable from Profile.
- [x] **Auth / validation hardening** — done (scoped to login rate limiting). Max 5 attempts per email per 15-minute window in `auth-service`.

## Settings

- [ ] **Profile picture** — avatar upload for a user's own profile, shown in Settings/Profile. Would follow the same upload pattern already used for group photos and showcase photos (presigned/multipart upload + storage volume).
- [x] **Help center** — done. `HelpScreen`, reachable from Profile: how the program works, registration fee info, FAQ, contact info.

## Showcase

- [ ] **Real-time GitHub progress monitoring** — pull live commit/activity stats from a group's linked GitHub repo (via GitHub API) and surface them, likely on the Showcase or Group screens. Needs a GitHub API integration (auth token handling, rate limits) — not yet scoped.

## Infrastructure

- [ ] **Backend hosting on Render** — move the backend off local Docker Compose to a hosted Render deployment (8 services + Postgres connection). Needs env/secrets setup on Render and a decision on whether all 8 services stay separate or get consolidated.

## Cross-cutting / QA

- [ ] **Everything on screen must be interactive** — audit pass to catch any remaining dead-end UI (elements that look tappable but do nothing, or navigate nowhere). Continues the same principle already applied screen-by-screen in `frontend/UI_UX_CHECKLIST.md` — a few items were *deliberately* left non-interactive this session (Dashboard's notification bell, Group Workspace's payment-method chips) specifically because they had no backing feature; this item is the reminder to revisit those once the backing features above land.

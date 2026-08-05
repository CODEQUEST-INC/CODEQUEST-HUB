# Backlog

Future work, not yet scheduled or scoped. Items here haven't been designed or
estimated — pull one out and flesh it out before starting it.

## Auth & account

- [x] **Email verification on registration** — done. Soft/non-blocking: registration still auto-signs-in immediately, a verification email goes out via Brevo SMTP, user verifies whenever via the "Verify email" row in Profile (`VerifyEmailScreen`, with resend). No access is restricted if never verified.
- [ ] **Sign up / sign in with Google** — OAuth provider integration alongside the existing email+password flow. Needs backend OAuth handling in `auth-service` and a frontend button on Login/Register.
- [x] **Forgot password** — done. Reset-token flow in `auth-service`, real email via Brevo SMTP, `ForgotPasswordScreen` reachable from Login.
- [x] **Change password** (Settings) — done. `ChangePasswordScreen`, reachable from Profile.
- [x] **Auth / validation hardening** — done (scoped to login rate limiting). Max 5 attempts per email per 15-minute window in `auth-service`.

## Settings

- [ ] **Profile picture** — avatar upload for a user's own profile, shown in Settings/Profile. Would follow the same upload pattern already used for group photos and showcase photos (multipart upload to Cloudflare R2).
- [x] **Help center** — done. `HelpScreen`, reachable from Profile: how the program works, registration fee info, FAQ, contact info.

## Showcase

- [ ] **Real-time GitHub progress monitoring** — pull live commit/activity stats from a group's linked GitHub repo (via GitHub API) and surface them, likely on the Showcase or Group screens. Needs a GitHub API integration (auth token handling, rate limits) — not yet scoped.

## Infrastructure

- [x] **Backend hosting on Render** — done. All 8 services deployed as free-tier Web Services via a `render.yaml` Blueprint (gateway: https://gateway-service-j9ql.onrender.com). Postgres stayed on Neon (unchanged). Since free-tier services can't receive private-network traffic, gateway routes to each service over its public URL rather than an internal hostname — this required allowlisting (not denylisting) proxied response headers and forcing `Accept-Encoding: identity` on downstream calls in `GatewayController`, since each response otherwise carried its own Cloudflare edge headers and could arrive gzip'd. (Railway was tried first — hit its free/trial plan's service-count limit; abandoned, project deleted.)
- [x] **File persistence on Render** — done. Group photos, proposal PDFs, and showcase photos were being written to each container's local disk, which Render wipes on every redeploy. Migrated all three (`group-service`, `project-service`, `showcase-service`) to Cloudflare R2 (S3-compatible), verified with a real upload/download/delete round-trip against both the local stack and the deployed backend. API/DB shape unchanged — only the storage backend swapped.

## Cross-cutting / QA

- [x] **Everything on screen must be interactive** — done. Both previously-flagged dead-ends (Dashboard's notification bell, Group Workspace's payment-method chips) are already gone from the code. A full audit of every `Pressable`/`Button`/chip across all screens found no other dead-end UI — every handler does real, observable work (state read elsewhere, API call, or navigation to a registered route).
- [x] **Task status button text fit** — done. Kanban columns are only 158pt wide; "Move to In progress" didn't reliably fit at 12.5pt bold. Swapped to an icon + short destination label (no "Move to" prefix), with `adjustsFontSizeToFit` as a safety net.
- [x] **Keyboard overlapping form fields** — done. `KeyboardAvoidingView` was used nowhere in the app despite 14 screens having text inputs. Added a shared `KeyboardAvoidingScreen` wrapper, applied across all of them.
- [x] **In-app PDF opening** — done. Proposal PDFs previously opened via `Linking.openURL` (external browser/PDF app). Added `react-native-webview` and a `PdfViewerScreen` (Google Docs viewer wrapper on Android, native on iOS), wired into both `ProposalStatusScreen` and `ReviewDetailScreen`.
- [ ] **App rotation** — deferred, not yet scoped. `app.json` already locks orientation to `"portrait"` for native, but that setting doesn't apply to the Expo web build (always follows the browser/device). Needs the user to specify what's actually broken (a native platform not respecting the lock, or a request to actually support landscape) before this can be worked.

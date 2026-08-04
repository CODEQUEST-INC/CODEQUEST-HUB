# UI/UX Improvement Checklist

Generated from the `ui-ux-pro-max` skill (installed at `.claude/skills/ui-ux-pro-max/`), applied against the actual screens in `frontend/src/screens/`. Rule IDs in brackets refer to `.claude/skills/ui-ux-pro-max/references/quick-reference.md` (10 rule categories) and `references/pro-rules.md` (native-app-specific rules + the canonical pre-delivery checklist) — search either with:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keywords>" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<keywords>" --stack react-native
```

A visual preview of 6 representative screens with these rules applied is published as an artifact (Login, Dashboard, Task Board, Group Workspace, Showcase Gallery, Review Queue).

**Existing baseline (don't rebuild):** the app already has a real theme system — `theme/palettes.ts` (light/dark colors + 6 named accents), `spacing.ts` (4/8/12/16/20/24/32), `radius.ts`, `typography.ts` (type scale 11/13/15/17/24), and a working `ThemeContext` with manual light/dark toggle. Checklist items below build on this, they don't replace it. `theme/colors.ts` is a deprecated light-only fallback — finish migrating any screen still importing it directly to `useTheme()`.

---

## Global checklist (applies to every screen)

Run this pass once, app-wide, before going screen-by-screen:

- [ ] **[no-emoji-icons]** No emoji used as functional icons anywhere (nav, buttons, status). Icon set is `@expo/vector-icons` (or equivalent) only, one stroke width, 24pt viewBox, sized via shared tokens (`icon-sm`/`icon-md`/`icon-lg`) — not ad-hoc `size={22}` scattered per screen.
- [ ] **[icon-style-consistent] — found, not fixed:** `MainTabs.tsx` uses `Ionicons` for every tab bar icon; every other screen in the app uses `Feather`. Two icon families have different stroke weights and visual language, so the tab bar reads slightly differently from the content above it. Fixing this means picking one family and re-mapping ~15 tab icons — a deliberate call on which icons look right, not a mechanical find-replace, so it wasn't done in this pass.
- [ ] **[touch-target-size / touch-spacing]** Every `Pressable`/`TouchableOpacity` is ≥44×44pt (use `hitSlop` where the visual icon is smaller), with ≥8pt gap between adjacent targets. Audit small icon-only buttons first (header icons, delete/remove buttons in lists).
- [ ] **[press-feedback / scale-feedback]** Every tappable card/row has a visible pressed state (opacity, tint, or 0.95–1.05 scale) — not just `TouchableOpacity`'s default. Check `Card`-based rows especially (Groups, Showcase, Review Queue).
- [ ] **[color-not-only]** Every status indicator (`StatusBadge`, `PaidBadge`, payment pills, task columns) pairs color with an icon or text label, not color alone.
- [ ] **[color-accessible-pairs]** Audit the 6 accent `fg`-on-`tint` pairs in `palettes.ts` for 4.5:1 contrast in both light and dark mode (amber and pink are the ones most likely to be borderline) — verify with a contrast checker, don't assume.
- [ ] **[safe-area-awareness]** Every screen with a custom header or the bottom tab bar respects `SafeAreaView`/`useSafeAreaInsets` — no content under the status bar or home indicator.
- [ ] **[reduced-motion]** Any custom animation (task-card transitions, carousel, step indicator) checks `AccessibilityInfo.isReduceMotionEnabled()` and disables/shortens itself accordingly.
- [ ] **[dynamic-type]** Screens with dense text (proposal detail, review feedback, task descriptions) don't truncate or clip at the largest system font size — test with iOS Larger Text / Android font scale maxed out.
- [ ] **[accessibilityLabel]** Icon-only buttons (camera upload, delete, back, chevrons) all have `accessibilityLabel`; decorative icons have `accessibilityElementsHidden`.
- [ ] **[confirmation-dialogs / destructive-emphasis]** Every destructive action (remove member, delete account, delete task, take down showcase, reject proposal) uses the danger token and requires a confirm step — check these are consistent (some screens use "tap again to confirm," others may use a native `Alert` — pick one pattern and use it everywhere).
- [ ] **[loading-buttons / submit-feedback]** Every async submit button (login, payment, proposal submit, scorecard submit) disables itself and shows a spinner while in flight, not just after.
- [ ] **[form-labels]** Every text input across the app has a visible label, not placeholder-only (register form, task form, admin CRUD forms, proposal form).

---

## Auth

### `LoginScreen.tsx` ✅ implemented
- [x] Email/password fields have visible labels above them, not placeholder-only text **[form-labels]**
- [x] Password field has a show/hide toggle **[password-toggle]**
- [x] Focused input shows a clear focus ring/border in the primary token color **[focus-states]**
- [x] Login button disables + shows a spinner during the request, error text appears near the form (not just a toast) **[submit-feedback, error-placement]** — was already correct
- [x] Email input uses `keyboardType="email-address"` / `textContentType="emailAddress"` + `autoComplete` for autofill **[input-type-keyboard, autofill-support]**

### `RegisterScreen.tsx`
- [ ] Role chips (student/supervisor/admin) meet the 44pt touch target and show a clear selected state beyond just color **[touch-target-size, color-not-only]**
- [ ] Conditional student fields (index number, student ID, cohort picker) animate in without layout jump and don't block keyboard navigation to them **[layout-shift-avoid]**
- [ ] Cohort picker chips are horizontally scrollable with a clear affordance if the list overflows the screen width, not clipped **[swipe-clarity]**
- [ ] Long form doesn't lose entered data if the user backgrounds the app mid-registration — consider basic autosave/restore for the biggest chunk (name/email) **[form-autosave]**

---

## Home / Dashboard

### `DashboardScreen.tsx` ✅ implemented
- [x] Only one primary CTA per role state ("Continue to Task Board", navigates to the Tasks tab) — stat tiles stay secondary/informational **[primary-action]**
- [x] Proposal status tile shows icon + label + color together, never color alone **[color-not-only]** — was already correct (StatTile pairs icon + text)
- [x] The "mentor" placeholder state uses the shared `EmptyState` component (icon, heading, message) instead of bare text **[empty-states]**
- [x] Greeting/header respects safe area under the status bar **[safe-area-awareness]** — already handled by the tab navigator's native header, no change needed

---

## Groups

### `GroupWorkspaceScreen.tsx` ✅ implemented
- [x] Group photo upload/remove buttons are ≥44pt (remove badge `hitSlop` bumped to 12) and already showed an upload progress spinner **[loading-buttons, touch-target-size]**
- [x] Payment status uses `PaidBadge` (icon-free but text+color, never color alone) consistently at card and per-member level — was already correct, no change needed **[color-not-only, state-clarity]**
- [x] Shirt-size chips now meet 44×44pt with a distinct selected state (already had one) **[touch-target-size, color-not-only]**
- [x] Pay/verify buttons already showed loading + a manual verify fallback; added an explicit hint line ("Complete payment in the browser, then come back here and tap verify") to close the pending-state gap **[timeout-feedback, error-recovery]**
- [x] Expand/collapse row already had a chevron affordance — added `minHeight: 44` and `accessibilityState={{ expanded }}` **[swipe-clarity]**
- [x] Member list already uses `FlatList` — confirmed already virtualized, no change needed **[virtualize-lists]**
- [x] Added `accessibilityLabel`/`accessibilityRole` to photo upload/remove, shirt chips, pay/verify buttons, and the expand row; added pressed-state feedback throughout (global checklist items, applied here)

---

## Proposals

> **Cross-cutting fix**: added `src/theme/proposalStatusStyle.ts` as a single source of truth for proposal-status color + icon + label. Previously `StatusBadge`, the progress steps, the history timeline, and the review-queue card tint each had their own ad hoc color mapping for the same 6 statuses — e.g. "submitted" rendered blue on the badge but violet on the review-queue card, on the same screen. All four now derive from the same function. `StatusBadge` also gained an icon (was text-only).

### `ProposalStatusScreen.tsx` ✅ implemented
- [x] Blocked steps (rejected/changes requested) now get an icon + the shared status color instead of a plain colored dot, and rejected vs. changes-requested are visually distinct from each other (previously both rendered as the same red dot) **[color-not-only]**
- [x] `StatusBadge` and the step indicator now share the exact same color for a given status **[consistency]**
- [x] PDF link failures (e.g. no PDF viewer installed) now show an error instead of an unhandled rejection; added `accessibilityLabel`/pressed feedback **[loading-buttons, error-recovery]**
- [x] Resubmit/withdraw reviewed — already visually distinct (filled primary vs. outlined danger); added `accessibilityLabel`/`accessibilityState` **[destructive-nav-separation]**
- [x] `EmptyState` already correct — no change needed **[empty-states]**

### `ProposalFormScreen.tsx` ✅ implemented
- [x] Field labels were already visible; added persistent helper text under Tech stack **[form-labels, input-helper-text]**
- [x] PDF picker now ≥44pt, rejects files over 10MB with a clear error message **[error-clarity, touch-target-size]**
- [x] Submit vs. resubmit label was already distinct — no change needed **[state-clarity]**
- [x] **Interim mitigation instead of full autosave**: a `beforeRemove` navigation guard now confirms before discarding a proposal with unsaved content (title/fields/PDF) on back-navigation. True disk-persisted autosave needs a new dependency (`@react-native-async-storage/async-storage` — not currently installed) and on-device testing that couldn't be done in this pass; flagged as a follow-up **[form-autosave]**

### `ProposalHistoryScreen.tsx` ✅ implemented
- [x] Timeline now uses the shared `proposalStatusStyle` for the 4 known action types (submitted/approved/rejected/changes_requested), matching `ProposalStatusScreen` exactly; unrecognized action strings still fall back gracefully **[consistency]**
- [x] Already used `FlatList` — no change needed **[virtualize-lists]**
- [x] Feedback text already wraps (no `numberOfLines` set) — no change needed **[truncation-strategy]**

---

## Tasks

### `TaskBoardScreen.tsx` ✅ implemented
- [x] Nested horizontal/vertical `ScrollView` axes don't conflict (perpendicular gesture directions) — reviewed, no change needed **[gesture-conflicts]**
- [x] "Move to next column" button now ≥44pt, and `LayoutAnimation.configureNext` gives the column move a visible crossfade/slide instead of an instant re-render **[state-transition, touch-target-size]**
- [x] Task card spacing already met the 8pt minimum — reviewed, no change needed **[touch-spacing]**
- [x] "New task" button sits in normal document flow above the tab bar, not a floating overlay — reviewed, no overlap risk **[safe-area-awareness]**
- [x] Added a summary row above the board showing all 3 column counts at once, so "Done" progress is visible without scrolling **[content-priority]**
- [x] Added `accessibilityLabel`/`accessibilityRole` and pressed-state feedback to task cards, the advance button, and "New task"

### `TaskFormScreen.tsx` ✅ implemented
- [x] Assignee chips now meet 44pt minimum height with `accessibilityState={{ selected }}` **[touch-target-size]**
- [ ] Due-date picker still a free-text field — **deferred**: a native date picker needs a new dependency (`@react-native-community/datetimepicker` or similar) plus on-device testing neither of which could be done in this pass. Added format helper text ("Format: YYYY-MM-DD, e.g. 2026-08-15") as an interim mitigation. **[system-controls]**
- [x] Delete now confirms via a native `Alert` ("Delete task? This can't be undone" / Cancel / Delete) before calling the API — was previously a single tap with no confirmation **[destructive-nav-separation, confirmation-dialogs]**

---

## Judging

### `judge/ScorecardScreen.tsx`
- [ ] Numeric score inputs (1–10) are large enough to tap precisely — avoid tiny stepper buttons; consider a slider or segmented control sized for touch **[no-precision-required, touch-target-size]**
- [ ] `ProgressBar` per criterion has a visible numeric value alongside it, not just a bar (screen readers and quick scanning both need the number) **[color-not-only]**
- [ ] Group-chip selector and cohort picker are clearly separated in hierarchy (cohort = context, group = the thing being scored) **[visual-hierarchy]**
- [ ] Submit is disabled until all criteria are scored, with a clear indicator of what's missing rather than a silent disabled button **[error-clarity]**

---

## Showcase

### `ShowcaseGalleryScreen.tsx` ✅ implemented
- [x] Thumbnails were already fixed 56×56 (not aspect-ratio-driven, but equally immune to layout jump) — reviewed, no change needed **[image-dimension, content-jumping]**
- [x] Filter chip horizontal scroll reviewed — this is a well-understood native mobile idiom (unlike a desktop web carousel) and RN has no `expo-linear-gradient` dependency installed to build a fade-edge hint safely; decided not to force an untested affordance in. **Not implemented, deliberately** **[swipe-clarity]**
- [x] `EmptyState` was already correct — no change needed **[empty-data-state]**
- [x] "My group's showcase" restyled from a plain text link into a tinted pill button with a trailing chevron, 44pt target, `accessibilityLabel` **[visual-hierarchy, touch-target-size]**
- [x] Added `accessibilityState={{selected}}` and pressed feedback to filter chips and gallery cards

### `ShowcaseDetailScreen.tsx` ✅ implemented
- [x] Added tap-to-navigate chevron overlay buttons (prev/next) alongside the swipe gesture and dots, so the carousel isn't gesture-only **[gesture-alternative, swipe-clarity]**
- [x] "View on GitHub" now has `accessibilityRole="link"` and shows an inline error ("Could not open this GitHub link") if `Linking.openURL` fails instead of an unhandled rejection **[error-recovery]**
- [x] Reviewed — paging is native scroll physics, not an app-driven animation, so there's nothing for `prefers-reduced-motion` to gate here **[reduced-motion]**

### `ShowcaseEditScreen.tsx` ✅ implemented
- [x] Photo cap behavior was already correct (`atCap` hides Add and shows a hint) — no change needed **[error-clarity]**
- [x] Photo delete badge now has `hitSlop={12}` (44pt effective target) and an `accessibilityLabel` **[touch-target-size]**
- [x] "Take down" was already separated/danger-toned — added `accessibilityLabel`/pressed state **[destructive-nav-separation]**
- [x] Gated-proposal `EmptyState` already explained why — no change needed **[empty-nav-state]**
- [x] GitHub URL field now uses `keyboardType="url"` and `autoCorrect={false}` (global input-type-keyboard item, applied here)

---

## Supervisor

### `ReviewQueueScreen.tsx` ✅ implemented
- [x] Card tint now uses the shared `proposalStatusStyle` instead of its own separate color map — fixes a same-screen mismatch where the badge (blue "submitted") and the card's left-border tint (violet) disagreed with each other **[consistency]**
- [x] Already `FlatList` with a stable `renderItem`, no inline component definitions — no change needed **[virtualize-lists]**
- [x] Row tap target was already the full card; added `accessibilityLabel`/pressed feedback **[touch-target-size]**

### `ReviewDetailScreen.tsx` ✅ implemented
- [x] Approve / Request changes / Reject now each carry an icon (check-circle / edit-3 / x-circle, matching the shared status style set) in addition to color + label **[color-not-only]**
- [x] Reject restyled as an outlined (not solid-fill) button with extra top spacing, so it reads as visually subordinate/set-apart from Approve and Request changes rather than an equal-weight third option in the row **[destructive-emphasis]**
- [x] Feedback label was already visible; added the same `beforeRemove` unsaved-changes guard used on the proposal form **[form-labels, form-autosave]**
- [x] Loading/error state was already correct — no change needed **[submit-feedback]**

---

## Admin

> All 8 admin CRUD screens (Cohorts/Groups/Criteria/Judges/Payments/Users) share a `ScrollView` + `.map()` pattern instead of `FlatList` — reviewed and left as-is: these lists are admin-only and bounded to capstone-project scale (dozens of cohorts/groups/users, not thousands), and several screens rely on inline-edit conditional rendering per row that's simpler to keep correct in a plain `.map()`. Converting to `FlatList` would be a real structural refactor with meaningful regression risk that can't be verified without running the app on-device. **Reviewed, deliberately not changed.** **[virtualize-lists]**

### `AdminHubScreen.tsx` ✅ implemented
- [x] Icon set was already consistent (Feather, uniform size) — no change needed **[icon-style-consistent]**
- [x] Menu cards now have `minHeight: 44`, a pressed state, and `accessibilityLabel` **[touch-target-size, press-feedback]**

### `CohortsScreen.tsx` ✅ implemented
- [x] Delete/Create were already separated; added `accessibilityLabel`, pressed state, and `minHeight: 44` to Edit/Save/Cancel/Delete/Add buttons **[destructive-nav-separation, touch-target-size]**
- [x] Active toggle already had a text label — no change needed **[color-not-only]**
- [x] Added visible field labels above Name/Year inputs (previously placeholder-only) — global `[form-labels]` rule, applied here

### `GroupsScreen.tsx` ✅ implemented
- [x] "Auto-generate groups" confirm copy was already excellent (explains consequences + "cannot be undone" in both the hint text and the confirm-button label) — no change needed **[confirmation-dialogs, error-clarity]**
- [x] `UserPicker` already had a loading spinner and a "No matches." empty state — no change needed **[loading-buttons, empty-data-state]**
- [x] Payment-paid tinting already pairs with `PaidBadge` text — no change needed **[color-not-only]**
- [x] Member remove button `hitSlop` bumped 8→16; member chip, supervisor change/cancel links, and Create button now have `accessibilityLabel`/pressed states; added field labels to Group number/Name inputs
- [x] Member chips (compact tag row) kept at their existing ~32pt height rather than forced to 44pt — a deliberate density call for a potentially long wrapped list of member tags, consistent with admin-density norms; the separate remove-button hit area does meet 44pt via `hitSlop`

### `CriteriaScreen.tsx` ✅ implemented
- [x] Weight `ProgressBar` numeric value was already shown; added a warning banner when active criteria weights don't sum to 100% **[error-clarity]**
- [x] Active toggle already labeled — no change needed **[color-not-only]**
- [x] **New gap found**: delete had *no* confirmation at all (unlike Cohorts' tap-twice) — added the same tap-twice pattern for consistency **[confirmation-dialogs, consistency]**
- [x] Added field labels to Name/Weight inputs, `accessibilityLabel`/pressed states/44pt to all buttons

### `JudgesScreen.tsx` ✅ implemented
- [x] `UserPicker` flow already matches Groups' exactly (shared component) — no change needed **[consistency]**
- [x] **New gap found**: Remove had *no* confirmation at all — added tap-twice confirm plus `minHeight: 44` and `accessibilityLabel` **[touch-target-size, confirmation-dialogs]**

### `LeaderboardScreen.tsx` ✅ implemented
- [x] Rank and avg score/judge count now use `fontVariant: ['tabular-nums']` **[number-tabular]**
- [x] Judge count was already visible per row — no change needed **[data-density]**
- [x] Virtualization — see the cross-cutting note above **[virtualize-lists]**

### `PaymentsScreen.tsx` ✅ implemented
- [x] Fee input already used `keyboardType="decimal-pad"` (better than plain numeric for a currency amount) — no change needed **[input-type-keyboard]**
- [x] Expandable list already reused `PaidBadge` exactly — no change needed **[consistency]**
- [x] **New gap found**: updating the fee had no confirmation at all, even when students had already paid the old amount — added an `Alert` confirm that only fires when `someAlreadyPaid` is true, explaining that changing it won't retroactively refund/recharge anyone **[confirmation-dialogs]**

### `UsersScreen.tsx` ✅ implemented
- [x] Search already debounced with a loading indicator — no change needed **[debounce-throttle]**
- [x] Delete-account converted from the same tap-twice pattern used everywhere else to a native `Alert.alert` naming the target user by name and role — deliberately the *strongest* confirm pattern in the app, reserved for this one highest-stakes action **[destructive-emphasis, confirmation-dialogs]**
- [x] Self-row now shows a "This is you" label instead of a button that's disabled with no visible explanation **[error-clarity]**

---

## Profile / Settings

### `ProfileScreen.tsx` ✅ implemented
- [x] Avatar uses `colors.primary`/initials, already meets contrast in both themes (reviewed against `palettes.ts` values) — no change needed **[color-accessible-pairs]**
- [x] Info card labels were already consistent — no change needed **[consistency]**
- [x] Settings link: added `minHeight: 44`, `accessibilityLabel`, pressed state

### `SettingsScreen.tsx` ✅ implemented
- [x] Dark mode `Switch` already had a text label and toggles instantly via context — no change needed **[state-transition]**
- [x] Logout was already visually separated from the toggle by its own section/styling — no change needed **[destructive-nav-separation]**
- [x] **New gap found**: Logout had *no* confirmation at all — added an `Alert` confirm ("Log out? You'll need to sign in again") **[confirmation-dialogs]**

---

## Navigation (cross-cutting, `RootNavigator.tsx` + tab config)

- [x] Active tab already highlighted via both color *and* outline→filled icon swap — no change needed **[nav-state-active]**
- [x] Back navigation relies on React Navigation's default state preservation; no `unmountOnBlur` overrides found — reviewed, no issue **[back-behavior, state-preservation]**
- [x] Profile/Settings already reachable from any depth via a dedicated "walk to root navigator" helper (`headerProfileButton.tsx`) — added `accessibilityLabel`/bumped `hitSlop` to the header icon button itself, which had neither **[persistent-nav]**
- [ ] **Not fixed — flagged as a product decision, see below** **[bottom-nav-limit]**

### 🚩 Flagged: the student bottom tab bar has 6 items, over the 5-tab guideline

`MainTabs.tsx` gives students **Dashboard, Group, Proposal, Tasks, Leaderboard, Showcase** — 6 tabs. Every other role (supervisor: 4, admin: 4, mentor: 3) stays under the limit; only the student role — the largest user group — exceeds it. On a 375pt-wide phone, 6 icon+label tabs get cramped, labels may truncate, and tap targets shrink. This is a genuine finding, not a styling tweak: fixing it means deciding which destination gets demoted off the bar (e.g. fold Leaderboard into a Dashboard card + link, since it's read-only and lower-frequency than Tasks/Proposal/Group; or introduce a "More" tab). That's an information-architecture call this pass didn't make unilaterally — flagging it for you to decide the right consolidation rather than guessing.

---

## Suggested order of attack

1. **Global checklist** first — fixes propagate to every screen at once (touch targets, icon consistency, color-not-only, safe areas).
2. **Auth + Dashboard** — first impression, highest traffic.
3. **Groups + Tasks** — most-used day-to-day screens, most complex interactions (payments, kanban).
4. **Proposals + Supervisor** — shared status vocabulary, fix together so they stay consistent.
5. **Showcase** — public-facing, most visual/media-heavy.
6. **Admin** — lowest traffic but highest blast-radius destructive actions; prioritize the confirmation-dialog and destructive-emphasis items even if visual polish waits.

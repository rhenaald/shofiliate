# Linear Project Protocol — Shofiliate (Hybrid Thin+)

Date: 2026-09-15 | Status: proposed | Team size: <10 | Choices locked: 1-week Cycles, phase-gate Milestones, minimal 5 labels, hybrid-thin specs

## 0. Goal

One Linear project, zero ceremony, readable by humans and AI agents (`get_issue` first, `get_document` only when needed). This doc is the rulebook. Ignore all prior Sigma labels/structure.

## 1. Project, team, cycles, statuses

- Single project `Shofiliate`, single team. No per-feature projects.
- 1-week Cycles, Mon–Mon. Only committed issues enter the cycle. Stretch goes to Backlog, never carried silently — re-commit explicitly next cycle.
- Statuses: `Backlog → Todo → In Progress → In Review → Done`, plus `Canceled` / `Duplicate`. New issues start in `Backlog` unassigned or triage-assigned. Cycle planning moves committed ones to `Todo` with assignee + milestone + exactly one label + cycle.
- One assignee per issue. Nothing sits `In Progress` unassigned. `In Review` always has a PR link comment.

## 2. Milestones — scoping rules (no fixed list)

Milestones are shippable phases, not sprints, not versions. Do not pre-create the whole roadmap.

- A milestone qualifies iff: (a) it ends in something demoable, (b) it holds 3–10 issues, (c) it spans 1–4 cycles. Smaller → merge into neighbor. Larger → split.
- Naming: `[Phase N] Outcome`, e.g. `[Phase 1] Auth + shell usable`. Target date = end of last cycle in that phase. Close milestone only when all its issues are `Done`/`Canceled`.
- Assignment: every `feature`/`bug` issue carries exactly one milestone. `chore`/`docs`/`spike` may carry none if truly unscoped (dependency bump, investigation).
- Create milestones just-in-time at phase start (phase + next in draft at most). Never more than 2 open milestones.
- Illustrative phases for Shofiliate (decide as you go, not prescribed): foundation/auth+DB+shell → catalog → cart/checkout → launch polish.

## 3. Issues & sub-issues (max 1 level)

- Parent = feature-sized, 1–3 days, shippable outcome. Sub = task-sized, <4h, single sitting. Flat top-level `bug`/`chore`/`docs`/`spike` get no subs. Never Epic → Feature → Task.
- Title format: `[area] Verb outcome`, area = short lowercase code (`auth`, `catalog`, `cart`, `checkout`, `ui`, `db`). Keep the whole title ≤60 chars, 3–6 words after the prefix — this keeps Linear's generated `gitBranchName` (`owner/sgm-123-short-slug`) short and usable as-is. Never hand-rename branches, delete after merge.
  - Good: `[auth] Email login via Better-Auth`
  - Bad: `[authentication] Implement the complete email and username login flow with all edge cases and polish`
- Description = 4-field header only, ≤15 lines:
  ```
  Goal: one line, user-visible outcome.
  Scope: bullets, incl. explicit Out: ...
  Acceptance: - [ ] checkable boxes (2–5)
  Links: full URLs — spec doc, Figma, related issue
  ```
  No prose paragraphs. Spec longer than 5 paragraphs → Linear Doc, linked in `Links:`, description stays header-only.
- Parent closes when all subs `Done` + acceptance boxes checked. Sub inherits parent milestone + cycle unless explicitly unscoped.

## 4. Labels — exactly one of five

`feature` (new user value) | `bug` (broken behavior, include repro in Scope) | `chore` (refactor/deps/CI, may be milestoneless) | `docs` (docs only) | `spike` (time-boxed investigation, must end this cycle with a decision comment and convert to feature/bug or close — never carries over).

- One type label per issue, subs inherit parent type unless it's a bug inside a feature. No area labels — area comes from the `[area]` title prefix. Urgency via Priority field (Urgent/High/Medium/Low), never via labels.

## 5. Attachments — only 3 cases, parent only

Attach only: (a) visual proof — mock/Figma shot, error screenshot/recording, (b) minimal sample payload (JSON snippet <30 lines), (c) nothing else as file — long specs live in Linear Docs and are linked, not uploaded as PDF/zip. Logs go in a comment code block, not as files.
Attach to the parent only; subs link up. Every image gets a 1-line caption in the description so AI gets context without fetching. File naming: `YYYY-MM-DD-short-desc.png`.

## 6. Comments — 4 types, on the issue itself

- `progress`: on status change or unblock — `Done X, next Y.` 1–2 lines. Sub detail on sub, weekly summary on parent.
- `blocker`: immediately, `@assignee` + what is needed + by when.
- `decision`: date + who + what changed; always also update the description Acceptance/Scope to match.
- `review`: once per issue when moving to `In Review` — PR URL + 2–4 test steps.
- No chit-chat, no `+1`, no duplicating the same status in parent and sub.

## 7. Weekly flow

Backlog (anytime) → cycle planning Mon (commit, assign, label, milestone) → execute (progress/blocker comments) → review (PR link, `In Review`) → demo/close (`Done`, check boxes) → next planning (explicit re-commit of spillover).

## 8. AI-agent notes

- Read order: issue description header first; fetch linked Linear Doc only when implementing; attachments last (`extract_images` for screenshots).
- Headers use literal `Goal: / Scope: / Acceptance: / Links:` prefixes so agents can parse. Links are absolute URLs. Acceptance boxes are the done-criteria — agents must verify each before marking complete.

## 9. Do not

No 2-level hierarchies, no area labels, no PDF/zip specs, no milestone-per-sprint, no multi-assignee issues, no comment chatter, no hand-made branch names.

# Change log

## 2026-10-24T23:38:29+05:30 — Record the implementation revision

- Changed: recorded implementation commit `80df2ad32fd8206e66c3b187d750d21bab0d59a1` in `SUBMISSION.md` and updated the AI/publication record. Game code is unchanged.
- Why: let reviewers identify the exact implementation independently of this follow-up documentation commit.
- Validation: reviewed 91 publishable files, found zero credential-pattern matches and zero broken local Markdown links, and passed the complete staged whitespace check. The existing submitted repository history is an ancestor of the implementation commit.
- Publication: implementation commit `80df2ad` was pushed successfully to the submitted repository's `main` branch; this subsequent commit records its SHA and publication status.
- Limitations: the participant's human review, physical demo, and organizer confirmations remain unverified; no additional runtime test result is claimed for this documentation-only update.

## 2026-10-24T23:35:48+05:30 — Publish the playable 3D Reality Raid implementation

- Changed: added the completed local game in `apps/` and `packages/`, reproducible setup/phone-test scripts, pinned dependencies and model assets, tests, licenses, screenshots, and implementation/demo documentation. Completed project details in `README.md`, `SUBMISSION.md`, and `AI_USAGE.md`; combined local ignores with the submitted template's credential/cache exclusions.
- Why: publish the playable game, including the requested 3D upgrade and two-player phone support, to the repository the owner submitted: `Devadathan69/GhostWire`.
- Behavior: authoritative hero/boss rooms, solo training, gesture/manual controls, three 3D worlds and two camera views, live-video Reality Breach, encounter configuration, results/rematch, and reconnect recovery. The waiting lobby survives a host refresh before its first boss joins.
- Validation already completed: production build and strict TypeScript passed; 37 unit/network checks and nine browser scenarios passed. The two-player camera/breach scenario passed again after the lobby fix. A separate public HTTPS check verified assets, invites, two-player shared combat, and media signaling.
- Repository history: this is an import of completed local work on top of the existing submitted repository. Earlier local implementation commits did not exist; no timestamps or milestone commits were fabricated, and shared history is preserved.
- Limitations: browser camera evidence is synthetic; physical phone gesture accuracy, venue-network media, live OpenAI generation, Docker, and physical Safari/iOS remain unverified. The temporary phone link requires the laptop to remain running; no permanent hosting is claimed. Human review and organizer eligibility/submission confirmations remain with the participant.

## 2026-10-24T21:53:05+05:30 — Correct Devin Hack Kochi event guidance

- Changed: corrected the current event name and AI tool guidance in `.github/pull_request_template.md`, `AGENTS.md`, `AI_USAGE.md`, `CHANGELOG.md`, `README.md`, `RULES.md`, `SUBMISSION.md`.
- Why: the organizer shared an older event template; Devin Hack Kochi has no
  major AI usage constraints and the template must not require a particular AI provider.
- Scope: preserved project implementation and historical assistance records.
- Removed obsolete template logistics, participation limits, and credit promises; current organizer instructions remain authoritative.
- Validation: reviewed documentation diffs, checked whitespace with `git diff --check`, and checked local Markdown links for new breakage.
- Limitations: maintainer review is pending; application tests were not run for this documentation-only correction.

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

The implementation import is recorded above. The detailed local phase and verification record is in [docs/IMPLEMENTATION_LOG.md](docs/IMPLEMENTATION_LOG.md). The following format remains available for future changes:

```text
## <actual timestamp> — <short change title>

- Changed: <feature or files changed>
- Why: <reason for the change>
- Validation: <commands or manual checks actually run, with results>
- Limitations: <known issues or "None identified in these checks">
```

## Template setup — 10 October 2026

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: Documentation scaffolding only; no participant project, application, or working demo is included. GitHub publication and template status are verified separately after creation.

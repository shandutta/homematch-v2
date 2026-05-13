# Product decisions — CSO audit Q3, Q4, Q5

**Date:** 2026-05-13
**Source:** `docs/audits/2026-05-13-backend-audit-plan.md`
**Owner:** product / engineering jointly

Three security findings from the deep CSO pass need product input before the code fix can land. For each, the engineering options are described with their tradeoffs and the call-to-make. The recommended choice is marked.

---

## Q3 — Invite acceptance does not verify `invited_email`

**Status:** Q6 (atomic acceptance) shipped. Email-match is the remaining gap.

**The risk in plain English:** Today, anyone who obtains the invite URL — by email forwarding, screenshot, referrer leak, server log — can claim the household as themselves. The schema stores `invited_email` but the accept action does not check it.

### Options

**A. Strict email match (recommended).**
The current authenticated user's primary email must match `invite.invited_email` (case-insensitive, trimmed). Mismatch returns "this invite is for someone else."

- **Pros:** Forwarding attacks are dead. Even if the token leaks, only the intended invitee can use it. Aligns with what most invite UX users expect.
- **Cons:** If the invitee signs up under a different email (e.g., they use `alice+work@gmail.com` at signup but the invite was sent to `alice@gmail.com`), the invite fails. They need a second invite, or someone has to update the invite's `invited_email`.
- **Effort:** ~30 min. Add an `invited_email` parameter to the RPC; compare to the user's email in the action before calling.

**B. Anyone-with-the-link.**
Treat the invite token like a Calendly link: anyone who has it can use it. Document this explicitly.

- **Pros:** Most flexible. Works for "I'll forward this to my partner."
- **Cons:** Treats the invite token as the entire security perimeter. Forwarding, leaked logs, social-engineered links all let anyone in. Once a household is shared, removing a misjoined member is a manual process.
- **Effort:** Zero code change. Document the trade-off in `docs/`.

**C. Hybrid — email match preferred, link override.**
If emails match, accept silently. If they don't, show "This invite was sent to alice@gmail.com. You're signed in as bob@example.com. Continue anyway?" and require a button click.

- **Pros:** Captures the common case (auto-accept for matching email) while preserving flexibility.
- **Cons:** More UI work. Confirmation-click can be social-engineered ("just click the button I sent you").
- **Effort:** ~2-3 hr including UI.

### Recommendation

**Option A — Strict email match.** This is a household-membership boundary, and most users will expect tokens to be addressed. Mismatch errors are recoverable (issue a new invite to the right address); leaked-token attacks are not.

### Owner sign-off

- [ ] Decided: A / B / C
- [ ] Approved by:
- [ ] Date:

---

## Q4 — `ai-repair.yml` exfiltrates raw CI logs to OpenRouter (Google Gemini)

**Status:** Workflow runs today on every CI failure with zero redaction.

**The risk in plain English:** On any failed CI run, the workflow grabs the last 8 KB of the failed job log plus the full content of any artifact `.log` / `.txt` / `.out` file and sends it to OpenRouter, which routes to Google Gemini. CI logs routinely contain DB error strings (with connection-string fragments), JWT payloads from failed auth tests, env-var values echoed by failing scripts, and Vercel preview URLs that carry credentials in query strings. None of that is intended for a third-party LLM.

### Options

**A. Redact before sending (recommended).**
Run the combined log through a regex scrubber before posting. Patterns: AWS-style keys, hex tokens > 24 chars, JWT shapes, anything matching `connection_string=`, `password=`, `api[_-]?key=`, `bearer `. Replace with `[REDACTED]`.

- **Pros:** Cheap, mechanical. Catches most accidental leaks.
- **Cons:** Regex won't catch novel secret shapes. Doesn't protect against the LLM provider being compromised.
- **Effort:** ~1 hr. Add a Node helper in the workflow script that filters `combinedLog` before the `fetch` call.

**B. Send only error type + line numbers, not raw content.**
Parse the failed job log to extract test names that failed, error class names, and file:line. Send only that structured summary. Don't send arbitrary text.

- **Pros:** Drastically smaller attack surface. The LLM gets enough to suggest fixes without seeing values.
- **Cons:** Requires parsing for multiple test runners (Jest, Vitest, Playwright). Less context for the LLM means less useful suggestions for some failures.
- **Effort:** ~3-4 hr.

**C. Disable the workflow.**
Turn the automation off; let humans triage CI failures.

- **Pros:** Zero exfiltration. Zero cost.
- **Cons:** Lose the automation that justified building it. (Worth asking: does anyone actually act on its output?)
- **Effort:** 1 line edit.

**D. Self-hosted LLM.**
Replace OpenRouter with a locally-run model (or Vercel AI SDK with a redacted prompt going only to an internal endpoint).

- **Pros:** No third-party data egress.
- **Cons:** Significant infra work. Not justified by the workflow's value alone.
- **Effort:** Days.

### Recommendation

**Option A (redact) for the next 24 hours, plus Option C question for the next week.** Redaction is cheap and stops the bleed. In parallel, look at the past month of ai-repair PR comments and ask: did anyone act on these? If no, switch to Option C. If yes, keep Option A and consider Option B as a follow-up.

### Owner sign-off

- [ ] Decided: A / B / C / D
- [ ] If A: regex set reviewed by:
- [ ] If C: confirm no one depends on the workflow output:
- [ ] Date:

---

## Q5 — `/api/users/search` enables systematic email enumeration

**Status:** Endpoint is authenticated and per-user rate-limited. The risk is what the data lets a logged-in attacker do, not access control.

**The risk in plain English:** A 3-character email-prefix query returns up to 10 onboarded users with `email + display_name + household_id`. A logged-in attacker can sweep the keyspace and harvest a list of real user emails (plus household membership graph). The rate limit slows it down but doesn't make it impossible — and one stolen account is enough.

### Options

**A. Exact-match only, by email (recommended).**
Require the caller to know the full email address. Return one or zero results. No prefix scanning.

- **Pros:** Enumeration is gone. The endpoint still works for the "invite a specific person" UX, which is its actual purpose.
- **Cons:** Loses the typeahead experience. Users have to type the whole email before they see "Found" or "Not found."
- **Effort:** ~15 min. Change `.ilike('email', \`${query}%\`)`to`.eq('email', query.toLowerCase())`.

**B. Return only `display_name`, never email.**
Keep prefix search, but strip `email` and `household_id` from the response. The caller knows whether a user exists; they don't see the address.

- **Pros:** Keeps the typeahead UX. Limits PII per response.
- **Cons:** Attacker still gets binary signal: "is `joe` an onboarded user?" By itself less useful, but combined with display names and outside data, still enables targeting.
- **Effort:** ~10 min.

**C. Hash-and-exact-match.**
Caller computes `sha256(email_lower)` client-side and sends the hash. Server compares to a precomputed hash column on `user_profiles`.

- **Pros:** Never expose plaintext email server-side beyond storage. Defeats both enumeration and PII leak. Works for invite UX.
- **Cons:** Adds a column + an index + a migration. Hash isn't unique enough alone for a rainbow-table defense, but combined with the auth requirement + rate limit it's solid.
- **Effort:** ~2-3 hr including migration + client + server changes.

### Recommendation

**Option A — exact match only.** It removes the enumeration risk completely with a 15-minute change. The product cost (no typeahead) is small for an invite flow that runs once per relationship. If the UX team later wants typeahead back, Option C is the path that doesn't reintroduce the leak.

### Owner sign-off

- [ ] Decided: A / B / C
- [ ] If A: confirm UX impact acceptable:
- [ ] If C: confirm budget for the migration:
- [ ] Date:

---

## Suggested process

1. Read each section above; pick one option per finding.
2. Write the chosen letter on the sign-off lines (commit this file to the branch).
3. Then engineering implements the chosen path — each fix is bounded above by the "Effort" estimate.
4. After all three land, the audit doc's "Critical / High" register is fully retired for the CSO pass.

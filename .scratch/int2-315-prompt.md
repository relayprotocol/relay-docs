# Claude Code prompt — INT2-315

Update the deposit address docs to reflect (a) the stance Max set in the linked Slack thread on wrong-currency deposits and (b) the fact that the withdraw UI at relay.link/withdraw is now live and handles several of these recovery cases.

Linear ticket: https://linear.app/relayprotocol/issue/INT2-315/update-deposit-address-docs-for-non-solver-deposits

## Background (what changed since the ticket was filed)

The ticket was filed May 6 when the withdraw UI was still pre-launch. Things have moved since:

- **`relay.link/withdraw` is live** as of 2026-05-12 (relay-client PR #870). It has Claim, Withdraw, and History tabs and works across all supported chains.
- **relay-kit failed-fill UI** now surfaces a "Withdraw" link to `relay.link/withdraw` when a failed transaction is withdrawable (relay-kit PR #989).
- The withdraw UI also supports recovering deposits with unrecognized deposit IDs after 7 days.

What relay.link/withdraw covers today (verified in the Slack thread linked below):
- Wrong **solver** currency sent to a **strict** deposit address — recoverable via withdraw UI.
- Wrong **solver** currency sent to an **open** deposit address — the existing flow auto-regenerates the quote and fills; recovery UI isn't needed in this case but is the fallback if anything stalls.
- Failed fills where `refundTo` is set — normal auto-refund still applies; withdraw UI is the path when auto-refund didn't run (e.g. integrator omitted `refundTo`).

What it does **not** yet cover:
- Wrong **non-solver** currency sent to either strict or open deposit addresses. This is what Max wanted the docs to flatly call non-recoverable. The fix for this is tracked in SLV-765 (solver-side sweep expansion) and RLY-4300 (Retool surface for support) — both still in progress.

Source threads (read these before editing — they have the exact stance we want to land on):
- Max's "align on stance" thread: https://relayprotocol.slack.com/archives/C0ATN2HF2FQ/p1778100344578679
- Rory's matrix of 4 cases + recovery paths: https://relayprotocol.slack.com/archives/C06KE004UP8/p1777558890041339
- George/Ted decision to remove the old railway-hosted withdraw UI now that relay.link/withdraw is live: https://relayprotocol.slack.com/archives/C08LWGN3682/p1778567331586329

## What to change

Primary file: `features/deposit-addresses.mdx`. Specifically:

1. **The comparison table (currently around line 62)** — the two "Wrong token" rows.
   - **Wrong token (solver currency) — Open**: keep the auto-regenerate-and-fill description, but add that the withdraw UI at `relay.link/withdraw` is the recovery surface when auto-flow doesn't complete.
   - **Wrong token (solver currency) — Strict**: replace the current "Not supported — refund or manual recovery" wording. Strict + wrong-solver-currency is now recoverable via `relay.link/withdraw`. Point at it explicitly.
   - **Wrong token (non-solver) — Open and Strict**: drop the "may require manual recovery" qualifier. Land on: not supported, and not currently recoverable. (Per Max's thread — this is the whole point of the ticket.)

2. **The "Refund Behavior" section (currently around line 911)** — the bullet for "Wrong currency (non-solver token)" should drop "manual handling may be required" and state plainly that non-solver deposits are not recoverable today. Add a short companion bullet (or `<Info>`) noting that for the cases the withdraw UI does cover (wrong solver currency, failed fills with unrecognized deposit IDs after 7 days, etc.), users can self-serve at `relay.link/withdraw`.

3. **The "Supported Currencies" `<Warning>` (currently around line 1306)** — currently reads "Non-solver tokens and NFTs sent to deposit addresses are **not recoverable** through normal processes." That's roughly the stance we want, but tighten it: drop "through normal processes" (implies an abnormal one exists), keep "not recoverable," and explicitly say to verify the token is a solver currency before depositing. Don't soften it.

4. **Cross-reference**: somewhere in the deposit addresses page, introduce `relay.link/withdraw` as the self-serve recovery surface for the cases it covers. The cleanest spot is probably a short subsection under "Refund Behavior" or as a `### Recovering stuck deposits` callout. Be specific about what it handles (wrong solver currency to a strict address; failed fills the integrator's app didn't catch; deposits with unrecognized deposit IDs after 7 days) and what it does not (non-solver currency).

5. **Sweep the rest of the repo** for other pages that describe wrong-currency / non-solver / manual-recovery behavior and align them with the same stance. Likely candidates surfaced by grep:
   - `references/protocol/components/deposit-addresses.mdx`
   - `references/api/api_guides/bitcoin.mdx`
   - `references/api/deposit-address-reindex.mdx`
   - `use-cases/bridging.mdx`
   - `solutions/commerce-and-payments.mdx`
   Don't blanket-edit — only update where the page makes a claim about recovery of wrong-currency or non-solver deposits.

## Style and conventions

Follow `CLAUDE.md` at the repo root. In particular:
- `features/*.mdx` is a feature guide per §3.1 — keep paragraphs to 2–3 sentences, active voice, "you" for reader actions, product-as-subject for definitions.
- Use `<Warning>` for the non-recoverability statement, `<Info>` for the withdraw-UI pointer. Stay under the 15-line callout cap (§2.5).
- Use **bold + backticks** in prose for parameter names (`` **`refundTo`** ``). Bare bold for `relay.link/withdraw` since it's a URL, not a param.
- Don't introduce italics. Don't widen the parameter table's `Required` column conventions — only the rows you're touching here are in scope.
- Internal links: root-relative paths only (`/features/...`), not `../features/...` and not the docs.relay.link absolute URL.

## Do not

- Do not add a changelog entry. The changelog policy in CLAUDE.md §4 covers breaking changes to the API or SDK — this is a doc-only correction of pre-launch wording, not a behavior change.
- Do not promise the withdraw UI will eventually cover non-solver deposits. Keep the docs to what's true today; the in-flight work (SLV-765, RLY-4300) is internal context, not something to surface to integrators yet.
- Do not touch the OpenAPI-derived API reference pages (`references/api/*.mdx` with `openapi:` frontmatter) unless one of them contains free-text we're contradicting. Those bodies are mostly empty by design (§3.3).

## Verification before opening the PR

After editing, re-read the deposit addresses page top to bottom and confirm:
- The four cells in the wrong-token rows of the comparison table all match the four-case matrix Ted laid out in Rory's thread (Reply 2 of 38).
- "Manual recovery" no longer appears anywhere on the page in a way that implies non-solver tokens can be recovered.
- `relay.link/withdraw` is mentioned at least once, in a place a reader looking up "my user sent the wrong token, what now?" would actually find it.
- All internal links resolve to real pages in this repo.

Branch name from Linear: `ted/int2-315-update-deposit-address-docs-for-non-solver-deposits`.

# Relay Docs Style Guide

This guide codifies the voice, tone, structure, and change-handling conventions for the Relay developer docs. It is written to be consumed by both humans authoring MDX and AI agents producing doc updates from upstream PRs (in `solver`, `relay-kit`, `protocol`, etc.).

This file lives at the repo root as `CLAUDE.md` so AI coding agents (Claude Code, Cursor, PR-time automation) pick it up automatically. It is also the style guide for human contributors — treat it like any other doc: edit, review, and keep it current.

---

## 1. How to use this guide

When writing or editing an MDX page, identify the **page type** by its path (see the path-glob table below), apply the matching **profile** in §3, then layer the global rules in §2. When the update is triggered by a change in an upstream repo, also apply the **change-type playbook** in §4.

### 1.1 Path → profile mapping

| Path pattern                                         | Profile                | Section |
| ---------------------------------------------------- | ---------------------- | ------- |
| `features/*.mdx`                                     | Feature guide          | §3.1    |
| `use-cases/*.mdx`                                    | Use-case guide         | §3.2    |
| `references/api/*.mdx` (with `openapi:` frontmatter) | API endpoint reference | §3.3    |
| `references/api/api_core_concepts/*.mdx`             | API concept page       | §3.3a   |
| `references/api/api_guides/*.mdx`                    | API integration guide  | §3.3b   |
| `references/relay-kit/sdk/**/*.mdx`                  | SDK reference          | §3.4    |
| `references/relay-kit/hooks/*.mdx`                   | Hooks reference        | §3.5    |
| `references/relay-kit/ui/*.mdx`                      | UI component reference | §3.6    |
| `references/api/quickstart.mdx`                      | Quickstart (exception) | §3.7    |
| `how-it-works/*.mdx`                                 | **Retired** — see §6   | —       |

Pages in `solutions/`, `resources/`, `security/`, `references/protocol/`, `references/websockets/` are out of scope for this guide's v1. Edit them by pattern-matching against existing pages in the same folder.

---

## 2. Global rules (apply to every in-scope page)

These apply to every in-scope page regardless of type.

### 2.1 Frontmatter

Every page must have frontmatter. At minimum:

```yaml
---
title: "<Page title>"
description: "<One-sentence summary, starts with a verb when possible>"
---
```

Add `sidebarTitle: "<Short label>"` when the title is long and a shorter label is preferred in the sidebar (common on hooks and UI components). Add `openapi: <method> <path>` only on API endpoint reference pages (see §3.3).

### 2.2 Heading levels

- `title` in frontmatter serves as H1 — never use `#` in the body.
- `##` is the primary body heading on every page type.
- `###` is for subsections of a `##` section.
- Do not go deeper than `###`; use **bold lead-in** prose to call out smaller subdivisions.

A historical drift on SDK action pages (which previously opened with `### Arguments`) was corrected on 2026-04-17 — all pages under `references/relay-kit/sdk/actions/` now use `##` as the primary heading.

### 2.3 Voice

Voice varies by page type (see profiles). Two rules apply everywhere:

- Write in **active voice** ("Relay bridges assets", not "Assets are bridged by Relay").
- Use **imperative** phrasing for step-by-step instructions ("Get a quote", "Execute the bridge", "Call `getQuote()`").
- Address the reader as **"you"** when describing the reader's actions.
- Use **the product name** (Relay, RelayKit, the SDK, the widget) as the subject when describing what the product does. Prefer a named subject over generic "it" / "the system" framing.

Do not use "we/our" to describe the product's behavior on reference pages (§3.3–§3.6). "We" is acceptable on feature guides and use-case pages when it reads like Relay-as-a-team giving advice ("We recommend protecting your API key on the backend…").

### 2.4 Tone

All pages use clear, Stripe-adjacent prose — plain English, short paragraphs (2–3 sentences max), concrete numbers when available (e.g. "median bridge time is 2.7 seconds"). The depth of conceptual explanation varies by page type:

- Reference pages (§3.3–§3.6): terse, definition-first.
- Feature guides (§3.1): practical and task-oriented.
- Use-case guides (§3.2): positioning-first, marketing-adjacent but grounded.

### 2.5 MDX components

- `<Tip>` — helpful hints and best practices.
- `<Warning>` — critical warnings (security-sensitive usage, deprecations, breaking constraints).
- `<Info>` — additional context or side-notes that aren't warnings.
- `<Note>` — short cross-cutting reminders, especially on API reference pages where the body is otherwise empty.
- **Callout length cap: 15 lines maximum.** `<Tip>`, `<Warning>`, `<Info>`, and `<Note>` are reserved for quick pointers. Keep them under 15 rendered lines, and do not nest code blocks or tables inside them. When the point needs more room, leave a one-sentence callout and link out to the feature guide, API reference, or concept page that carries the full explanation.
- `<CodeGroup>` — use when one page shows the same flow in multiple surfaces (e.g. `SDK` + `API`, or `SDK` + `Hooks` + `API`). Order labels **SDK → Hooks → UI → API** when all apply.
- `<Card>` / `<CardGroup>` — overview/landing pages only.
- Imported `/snippets/*.mdx` — prefer a snippet over duplicated prose for anything that appears on ≥2 pages (e.g. `<AppBalance />`, `<GetAnApiKey />`, `<DeprecatedExecuteApi />`).
- Horizontal rules (`---`) separate major sections on feature guides. Do not use them on reference pages.

### 2.6 Links and cross-references

- Internal links use root-relative paths: `[Fast Fill](/features/fast-fill)` — not relative (`../features/...`), not absolute URLs (`https://docs.relay.link/...`).
- Anchor links use the Mintlify-generated slug: `/references/api/api-keys#how-to-get-an-api-key`.
- When introducing a concept that has its own page, link on first mention.
- External links (GitHub, viem, tanstack, etc.) open in the same tab by default unless the page already uses `target="_blank"` in a `<Card>` block.

### 2.7 Tables

Parameter tables are the dominant structured element on reference pages.

- Columns: `Property` / `Description` / `Required` for SDK, Hooks, UI.
- `Property` cells use `**paramName**` (bold, no backticks) — consistent with current practice across SDK, hooks, and UI.
- Keep cell descriptions concise; move long explanations into prose below the table.
- `Required` column uses ✅ / ❌. **Only include the `Required` column when the table has a mix of required and optional params** — if everything is required (or everything is optional), omit the column entirely. Use a compound value like `✅ (❌ if X)` when requirement is conditional.
- Precede every parameter table with a one-line intro sentence ("Arguments:" / "Parameters:" are acceptable, but a full sentence reads better).
- When the table intentionally shows only a subset of parameters, call that out in the intro sentence and link to the full reference (e.g. "The most commonly used parameters are below; see [<full ref>](/...) for the complete list.").

### 2.8 Code examples

- **Default language: TypeScript or JavaScript.** Use another language only when the page is specifically about that surface (e.g. a curl example on an API page).
- **Avoid multiple tabs** unless the tabs show genuinely isolated scenarios or examples. Do not use tabs to show the same flow in two syntactically similar styles.
- **Assume types exist.** For TypeScript snippets, do not write out the full type definitions inline — lean on inference and imported types. The goal is a paste-and-run block, not a type tutorial.
- Feature guide examples use `<CodeGroup>` with at least `SDK` and `API` variants. Add `Hooks` when the flow is idiomatic in React.
- SDK/Hooks examples use `typescript`. UI component examples use `tsx`.
- Each code block is self-contained — include imports, client construction, and any prerequisite setup, so the reader can paste-and-run.
- Comment the `// 1. …`, `// 2. …` flow of multi-step examples.
- Placeholders: `YOUR_API_KEY`, `WALLET_ADDRESS`, `RECIPIENT_ADDRESS` (all caps, snake_case).
- When a block exceeds 35 lines, wrap it with `expandable` so it collapses by default.

### 2.9 Text emphasis

- **Bold** is for parameter names, values the reader has to type/recognize, and UI element names.
- `Backticks` are for code values, endpoints, file paths, addresses, and type names in prose.
- In **parameter tables**, `Property` cells use `**paramName**` (bold, no backticks) — see §2.7. This is the established convention in this repo.
- In **prose references** to a parameter, use ``**`paramName`**`` (bold + backticks) to match the convention used in guides like `features/fast-fill.mdx`.
- **Avoid italics.** Prefer bold when something needs emphasis. Italics are reserved for the rare case where bold already carries a structural meaning on the same line.

### 2.10 Paragraph length

Keep paragraphs to **2–3 sentences max**. If a paragraph runs longer, split it or convert the tail into a bullet list / callout. This rule applies to every in-scope page type.

---

## 3. Per-page-type profiles

Each profile includes: canonical exemplar, voice, tone, expected sections, and notes.

**How to read the "Sections" list in each profile:** the only strictly required element is the intro paragraph (§3.1) or its equivalent opening content on reference pages (frontmatter that renders as the page entry). Every other section is **optional** — but when a page includes it, the section should follow the form and ordering below. Automation consuming this file should validate the shape of sections that are present, not flag missing ones.

### 3.1 Feature guide (`features/*.mdx`)

- **Exemplar:** `features/fast-fill.mdx`
- **Voice:** "you" for reader actions; product-as-subject for definitions ("Fast Fill is a feature that…"); "we" acceptable for advisory prose.
- **Tone:** practical, task-oriented, moderately warm. Each feature guide answers: what is it, who needs it, how do you wire it up, what goes wrong.
- **Required:** frontmatter (per §2.1) and an **Intro paragraph** — one paragraph, starts with `<FeatureName> is a feature that …` or similar definitional framing. Nothing else is mandatory.
- **Optional sections (if included, use this form and order):**
  1. Snippet imports.
  2. `## Requirements` — numbered list, each item formatted as `**Requirement Name** — Explanation.` with an inline link to the thing that fulfills it.
  3. `## How to use it?` — one or two prose paragraphs describing the flow, followed by `### Example` containing a `<CodeGroup>` with at least SDK and API labels.
  4. `## Caveats` — bullet list of gotchas and recommendations.
  5. Additional `### Example` variants, inline `<Info>` callouts (for parameter-specific notes), imported snippets (e.g. `<AppBalance />`).

### 3.2 Use-case guide (`use-cases/*.mdx`)

- **Exemplar:** `use-cases/bridging.mdx` (mirror structure also in `cross-chain-swaps.mdx`).
- **Voice:** product-as-subject ("Relay enables…"); "we/our" acceptable for positioning ("Our comprehensive approach to App Fees…"); reader's "you" used sparingly.
- **Tone:** positioning-first, marketing-adjacent, but anchored in concrete numbers and links to the underlying primitives. Short.
- **Required:** frontmatter (per §2.1) and an **Intro paragraph** describing what the use case is and Relay's angle on it.
- **Optional sections (if included, use this form and order):**
  1. Hero image (`![title](/images/<Name>.png)`) between frontmatter and intro.
  2. **Benefits block** — 3–5 bolded lead-ins, each on its own line, formatted as `**Benefit Name** - Explanation`. No surrounding bullets. These read as a scannable list without `-`/`*` markers.
  3. `## How it Works` — one paragraph, prose, links to the underlying primitives (Depository Contract, Quote API, etc.).
  4. Closing CTA — "To learn how to integrate Relay into your application, check out our [Quickstart Guide](/references/api/quickstart)." or equivalent link.
- **Do not use:** code examples, `<CodeGroup>`, parameter tables, `<Warning>`/`<Info>` callouts. Use-case pages stay prose-only.

### 3.3 API endpoint reference (`references/api/*.mdx` with `openapi:` frontmatter)

- **Exemplar:** `references/api/get-quote-v2.mdx`.
- **Source of truth:** the OpenAPI spec (https://api.relay.link/documentation/json). The MDX page is a **stub** that tells Mintlify which operation to render.
- **Required frontmatter:**
  ```yaml
  ---
  title: "<Short human title, Title Case>"
  description: "<One-sentence summary of what the endpoint returns/does>"
  openapi: <method> <path>
  ---
  ```
- **Body content:** optional. Leave empty unless one of these applies:
  - Endpoint is deprecated (§4.3).
  - The endpoint has a cross-cutting note that OpenAPI can't express (use a `<Note>` or `<Info>` callout; keep it short).
- **Voice/tone:** not applicable to the auto-generated body. Keep `title`/`description` terse and imperative ("Execute a quote", "Get execution status").
- **Naming:** prefer `<verb>-<noun>` filenames (`get-quote`, `execute`, `claim-app-fees`). Versioned endpoints append `-v2`/`-v3`. The previous version is retained as a deprecated page — see §4.3.

### 3.3a API concept page (`references/api/api_core_concepts/*.mdx`)

Treat structurally like a **feature guide** (§3.1) minus Requirements. These pages explain API-level concepts (trade types, fees, refunds, step execution). Voice leans slightly more technical than `features/`.

### 3.3b API integration guide (`references/api/api_guides/*.mdx`)

Treat structurally like a **feature guide** (§3.1). Usually end-to-end walkthroughs with a `<CodeGroup>`.

### 3.4 SDK reference (`references/relay-kit/sdk/**/*.mdx`)

- **Exemplar:** `references/relay-kit/sdk/actions/getQuote.mdx`.
- **Voice:** imperative / third-person in table descriptions ("The chain id to deposit funds on"); "you" permitted in transitional prose and callouts.
- **Tone:** technical, reference-manual density.
- **Required:** frontmatter (`title` is the exact function/export name as it appears in source, case-sensitive; `description` starts with a verb).
- **Optional sections (if included, use this form and order):**
  1. `## Arguments` (or `## Parameters` — prefer `Arguments` for SDK actions, `Parameters` for top-level exports like `createClient`), followed by a parameter table per §2.7. For complex nested arguments, follow the argument table with a dedicated `## <Name> Parameters` sub-table (see `getQuote`'s `## Quote Parameters`).
  2. One or more `## <Variant> Example` sections, each a single `typescript` code block. Common variants: `Native Bridge`, `Cross-Chain Swap`, `Wrap/Unwrap`, `Send`, `Server-Side`.
  3. Closing `**Note** -` paragraph linking to the related conceptual page when context is needed.
  4. `<Warning>` callouts directly under an argument table for security-critical usage (API keys, client-only secrets).
- **Do not:** use `<CodeGroup>` for SDK-only examples. Reserve CodeGroup for pages that span multiple surfaces.

### 3.5 Hooks reference (`references/relay-kit/hooks/*.mdx`)

- **Exemplar:** `references/relay-kit/hooks/useQuote.mdx`.
- **Voice:** same as SDK reference, with "you" appearing more in prose because React hooks naturally orient around the consumer.
- **Tone:** technical, oriented toward React integrators.
- **Required:** frontmatter including `sidebarTitle` (the hook name).
- **Optional sections (if included, use this form and order):**
  1. `## Parameters` — table per §2.7.
  2. `## Return Data` — short prose describing the object shape; link to underlying types or related pages.
  3. `## Usage` — `<CodeGroup>` with clear labels (`Fetching a Quote`, `Executing a Quote`, etc.).
  4. `## Query Function` — standalone code block showing the underlying `queryX` export for non-React consumers.

### 3.6 UI component reference (`references/relay-kit/ui/*.mdx`)

- **Exemplar:** `references/relay-kit/ui/swap-widget.mdx`.
- **Voice/tone:** technical reference, "you" used sparingly.
- **Required:** frontmatter including `sidebarTitle`.
- **Optional sections (if included, use this form and order):**
  1. Hero screenshot (`![<ComponentName>](/images/<component-slug>.png)`) between frontmatter and the first `##` section.
  2. `## Parameters` — table per §2.7.
  3. `## Usage` — a single `tsx` code block (not a CodeGroup). Include all imports and realistic placeholder state.
  4. Additional `## Theming` / `## Configuration` sections where configuration surface is rich.
- **Sub-component sections:** When a page covers related auxiliary components (e.g. `SlippageToleranceConfig` on the swap widget page), add a `## <Sub-component Name>` section with a short paragraph, then `### Parameters` and `### Usage`.

### 3.7 Quickstart (exception)

`references/api/quickstart.mdx` is intentionally one-of-a-kind. Do not impose a profile on it. It gets its own treatment because its job is different from reference and different from feature guides — it is the single "you are here" entry point. When editing quickstart, pattern-match against the existing page; when changes originate from upstream (new onboarding step, new default parameter), flag for human review rather than letting automation rewrite it.

---

## 4. Change-type playbooks

These describe how a diff in `solver`, `relay-kit`, or `protocol` should map to doc updates. The goal is to make the intent of each update legible to a PR author reviewing an AI-generated draft.

### 4.1 New feature / new primitive

This guide does not yet prescribe a fixed rule for where net-new features land (product feature vs. new endpoint vs. new hook). The observed pattern, summarized from the current docs, is:

- New product-facing capability → new MDX in `features/` following §3.1.
- New API endpoint → new MDX in `references/api/` following §3.3; wire into `docs.json` under the relevant API group.
- New SDK action / hook / UI component → new MDX in the matching `references/relay-kit/<subpath>/` following §3.4 / §3.5 / §3.6.
- Related existing pages (use-cases, feature guides, quickstart) may also need updates; this is a judgment call and should be a human review step for now.

Automation design for this flow is intentionally deferred; the current rule is "make a draft, flag surfaces that might need a companion update, let the PR author decide."

### 4.2 Breaking change

Breaking changes are renames, removals, signature changes, return-shape changes, and endpoint path changes.

- **Edit pages in place.** The page describing the changed surface is updated to reflect the new shape. Do not leave an "old version" trace in-line.
- **Log in a per-product changelog.** Breaking-change narratives live in the product's changelog, not on the page itself. The changelogs are:
  - `references/api/changelog.mdx` — for API endpoint changes (create this page; wire into the API Reference nav as a top-level entry).
  - Future: `references/relay-kit/sdk/changelog.mdx`, `references/relay-kit/ui/changelog.mdx`, etc. — add when the first breaking change in that surface ships.
- **Update inbound links.** Any page that referenced the old name / path / signature must be updated in the same PR.
- **No inline `<Warning>` callout on the updated page.** The changelog is the record. Exception: when the rename has a migration subtlety that every reader must see (e.g. param reordering with silent behavior change), add a one-liner `<Info>` with the date and a pointer to the changelog entry.

### 4.3 Deprecation

Deprecation applies when the old surface continues to exist and work, but is marked as superseded. Current practice (observed on `get-intents-status`, `get-config`, `get-price`, `get-currencies`, `get-quote`):

- Keep the page in place — same filename, same frontmatter (including the original `openapi:` path).
- Insert a single `<Warning>` callout immediately after the frontmatter pointing to the replacement:
  ```mdx
  <Warning>Please use [<Replacement>](/references/api/<replacement-slug>) as this is deprecated</Warning>
  ```
  When the same deprecation message is reused on ≥2 pages, prefer importing a shared snippet (see `/snippets/DeprecatedExecuteApi.mdx`).
- Move the page into the `"Deprecated"` nav group in `docs.json`.
- **No sunset date required.** Pages stay live indefinitely until someone decides to delete them.
- This pattern is codified **for API endpoint reference pages** today. SDK / Hooks / UI have not needed deprecations yet; when they do, apply the same pattern (Warning callout + move to a "Deprecated" group in the relevant tab) unless a different convention is agreed.

### 4.4 Bug fix / behavior change

- If the fix changes observable behavior (error shape, timing guarantee, success/failure classification), update the relevant page's prose and add a changelog entry per §4.2.
- If the fix restores documented behavior, no doc update is required.
- If the fix is invisible to integrators (internal refactor), no doc update is required.

### 4.5 Changelog page format (API only, for now)

`references/api/changelog.mdx` is a new page introduced by this guide. Structure:

```mdx
---
title: "API Changelog"
description: "Record of breaking changes, deprecations, and notable additions to the Relay API"
---

## <YYYY-MM-DD> — <Short summary>

**Breaking** — `<endpoint or field>`: <what changed, with before/after>. [Migration note if any.]

**Deprecated** — `<endpoint>` is now deprecated. Use [<Replacement>](/references/api/<replacement-slug>) instead.

**Added** — `<endpoint or field>`: <what's new>.
```

Entries are newest-first. Each entry is a `##` heading with the date and a one-line summary. Body uses bolded change-type leads (`**Breaking**`, `**Deprecated**`, `**Added**`) on their own lines — matching the bolded-lead pattern already used on use-case pages (§3.2).

---

## 5. Terminology

- **Relay** — the product, always capitalized, no italics.
- **Relay Network** — capitalized when referring to the cross-chain infrastructure as a named thing.
- **Relay Depository Contract** — capitalized, link to `/references/protocol/overview` on first mention.
- **RelayKit** — one word, both caps, when referring to the suite of SDK + Hooks + UI packages. Package names on disk / in imports are lowercase-hyphenated (`relay-kit`, `relay-sdk`, `relay-kit-hooks`, `relay-kit-ui`).
- **SDK** — all caps in prose. The full name is "Relay SDK" on first mention, "the SDK" thereafter.
- **solver** — lowercase in prose (role, not proper noun). Capitalize only at the start of a sentence.
- **relayer** — lowercase in prose.
- **quote** / **Quote** — lowercase in prose ("get a quote"); capitalized only when referring to the API/SDK type (e.g. "the `Quote` object").
- **API key** — capital `API`, lowercase `key`. Normalize `API Key` and `api key` variants to `API key` in prose (do not touch code, URLs, or HTTP header names).
- **cross-chain** — hyphenated, lowercase.
- **same-chain** — hyphenated, lowercase.
- **onchain** — one word, no hyphen.
- **Chain names** — use canonical casing: `Ethereum`, `Base`, `Arbitrum`, `Optimism`, `Solana`, `Bitcoin`, `Sui`, `Tron`, `Eclipse`.
- **Token symbols** — all caps, no backticks in prose: `ETH`, `USDC`, `DAI`. Use backticks only when showing the symbol in code or when distinguishing from a token name.
- **Contract addresses** — backticked, lowercased hex.

---

## 6. Cleanup TODOs from this codification

Flagged during the drafting of this guide. These are one-time doc hygiene items, not automation work.

### Completed (2026-04-17)

1. ~~**Retire `how-it-works/swapping.mdx`.**~~ Removed; redirect to `/use-cases/cross-chain-swaps` added in `docs.json`.
2. ~~**Retire `how-it-works/the-relay-solver.mdx`.**~~ Removed; redirect to `/references/protocol/overview` added in `docs.json`. The empty `how-it-works/` directory was also removed, and the pre-existing `/how-it-works/the-reservoir-relayer` redirect was retargeted to `/references/protocol/overview`.
3. ~~**Migrate SDK action pages from `###` to `##`.**~~ All files under `references/relay-kit/sdk/actions/*.mdx` now open with `##` as the primary heading (`claimAppFees`, `execute`, `executeGaslessBatch`, `fastFill`, `getAppFees`, `getQuote`).

### Open

4. **Backfill frontmatter** on any page that lacks `title` / `description`. Run a corpus-wide sweep.
5. **Create `references/api/changelog.mdx`** with the format in §4.5 and add it to the API Reference top-level nav in `docs.json`.
6. **Normalize `API key` capitalization** across the corpus — replace `api key` and `API Key` occurrences in prose with `API key` (do not touch code, URLs, or HTTP header names).
7. **Retire `how-it-works/` as a documented page type.** It is not present in `docs.json` navigation and should not accept new content. (Folder removal is done; keep this item as a reminder for reviewers of any inbound PR that tries to add content there.)

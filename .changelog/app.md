# relay.link changelog

The App line of [docs.relay.link/changelog](https://docs.relay.link/changelog). Curated copy
about the relay.link app — not a log of merged pull requests, and not derived from
relay-client. Add an entry when there is something worth announcing to users.

`scripts/build-changelog.mjs` reads this file directly. It uses the same shape as
`references/api/changelog.mdx`: newest first, one `##` heading per date, and one paragraph per
change led by a bolded type.

```md
## 2026-08-03 — Global search finds every matching request

**Changed** — Searching a transaction hash now lists every request that matches it, instead
of opening the first match directly.
```

- **Types**: `**Breaking**`, `**Deprecated**`, `**Behavior change**`, `**Added**`, `**Changed**`, `**Fixed**`, `**Removed**`. They group per day on the published page.
- The date is the day the change reached users, and must be a real calendar date.
- A heading that does not match `## YYYY-MM-DD — <summary>` is skipped, so keep the shape exact.
- Write for someone using the app: what changed, and what it means for them.

<!-- Entries below, newest first. -->

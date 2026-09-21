# Relay Dashboard changelog

The Dashboard line of [docs.relay.link/changelog](https://docs.relay.link/changelog). Curated
copy about [dashboard.relay.link](https://dashboard.relay.link) — not a log of merged pull
requests, and not derived from the developer-dashboard repo. Add an entry when there is
something worth announcing to integrators.

`scripts/build-changelog.mjs` reads this file directly. It uses the same shape as
`references/api/changelog.mdx`: newest first, one `##` heading per date, and one paragraph per
change led by a bolded type.

```md
## 2026-08-03 — Global search finds every matching request

**Changed** — Searching a transaction hash now lists every request that matches it, instead
of opening the first match directly.
```

- **Types**: `**Breaking**`, `**Deprecated**`, `**Behavior change**`, `**Added**`, `**Changed**`, `**Fixed**`, `**Removed**`. They group per day on the published page.
- The date is the day the change reached integrators, and must be a real calendar date.
- A heading that does not match `## YYYY-MM-DD — <summary>` is skipped, so keep the shape exact.
- The dashboard went public on 2026-07-16. Work that shipped during the invite-only pilot is
  covered by that day's launch entry rather than dated to when it merged.
- Internal-only surfaces — staff view modes, abuse controls, onboarding plumbing — do not
  belong here. Write for an integrator using the product.

<!-- Entries below, newest first. -->

## 2026-08-11 — Observability for your API traffic

**Added** — A new Observability page shows what your integration is actually doing: request
volume, error rates, and rate limit pressure over any time range, broken down by endpoint and
by API key. Start from the overview, then open a single endpoint to see where throttling or
errors concentrate.

This is the context the rate limit alert emails were missing. When a key hits its limit you can
now see how often, on which endpoint, and whether it is worth acting on — instead of an alert
with nowhere to go.

## 2026-07-31 — A Support role for the teams handling your tickets

**Added** — Invite teammates as Support and they get the Requests surface — search, filters,
saved views, request detail, and reindexing — without access to API keys, credentials, or
billing. Keys surface to them as names only, so support can narrow a search to the right one
without ever seeing its value.

## 2026-07-16 — The Relay Dashboard is now available

**Added** — The Relay Dashboard is out of pilot and open to every integrator at
[dashboard.relay.link](https://dashboard.relay.link) — one operational interface for your
integration, self-serve from day one.

- **Org and team management** — invite teammates, assign roles, and control access.
- **API keys** — create and configure keys, each with its own webhooks, allowlists, and rate
  limits, and get alerted by email when one hits its limit.
- **App fees and fee sponsorship** — track balances, withdraw earnings, link a sponsorship
  wallet, and sponsor your users' fees.
- **Request visibility** — compose filters across status, chains, currencies, amounts, and
  time; open built-in views like Failed and Refunds in one click; save your own named views
  with the columns you want; and drill into any request for its full route, status, and
  component-level fee breakdown.

Provisioning a standard-tier key no longer goes through a form and a Slack thread — sign up and
create one yourself.

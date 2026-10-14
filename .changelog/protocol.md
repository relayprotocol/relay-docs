# Relay Protocol changelog

The Protocol line of [docs.relay.link/changelog](https://docs.relay.link/changelog). Curated
copy about Relay's onchain contracts that integrators call or check: the platform execution
contracts (router, approval proxy) and the protocol settlement contracts. It is not a log of
contract deploys or merged pull requests, and nothing generates it: add an entry by hand when a
contract change affects integrators.

`scripts/build-changelog.mjs` reads this file directly. It uses the same shape as
`references/api/changelog.mdx`: newest first, one `##` heading per date, and one paragraph per
change led by a bolded type.

```md
## 2026-10-14 — New router and approval proxy

**Added** — Router 3.2 and a new approval proxy are deployed on all supported EVM chains.
```

- **Types**: `**Breaking**`, `**Deprecated**`, `**Behavior change**`, `**Added**`, `**Changed**`, `**Fixed**`, `**Removed**`. They group per day on the published page.
- The date is the day the change reached integrators (the announcement, or the switch itself), and must be a real calendar date.
- A heading that does not match `## YYYY-MM-DD — <summary>` is skipped, so keep the shape exact.
- Internal changes (deploy tooling, owner only functions, chains Relay does not support) do not belong here. Write for an integrator.

<!-- Entries below, newest first. -->

## 2026-10-14 — New router and approval proxy

**Added** — Router 3.2 and a new approval proxy are deployed on all supported EVM chains. Most chains use router `0x0729e2a4716d9f7dd17858d5d504426d228697f7` and approval proxy `0x5567954cd026cebfe486062cb75848e0f1c12e58`; Cronos, Linea, Mantle and Metis use router `0x6328ea02d28131e58b28e55c6258258a30d90e05` and approval proxy `0xe4dfbd5e6784db1058124e2c87554c0591f0fb7b`. [Get Chains](/references/api/get-chains) lists the pair for each chain under `contracts["v3.2"]`.

**Behavior change** — On October 26, 2026 at 10 AM ET, Relay starts routing through the new contracts on all supported chains, and `contracts.erc20Router` and `contracts.approvalProxy` in Get Chains switch to them. Both pairs stay live during the transition, so if you validate contract addresses, allow both. Token approvals go to the new approval proxy, so a returning user approves once more ([migration notes](/references/api/api_resources/contract-addresses#migrating-to-the-new-router)).

**Changed** — The router's `SolverCallExecuted` event logs a 32 byte hash of the call data instead of the call data. On the approval proxy, the Permit2 witness includes `msgValue`, `permitTransferAndMulticall` (ERC-2612) no longer has a nonce in its permit struct, and `permit3009TransferAndMulticall` takes an extra `multicallSignatures` argument, because ERC-3009 permits need a MulticallAuthorization signature that clients opt into with `useMulticallAuthorization`. Nothing changes for integrations that only use the transaction data returned by the quote API.

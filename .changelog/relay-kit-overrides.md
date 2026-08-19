# RelayKit changelog overrides

relay-kit's changesets publish to [docs.relay.link/changelog](https://docs.relay.link/changelog)
as written. This file rewrites the ones that read like commit messages rather than changelog
entries — nothing else needs to be here, and an entry with no override publishes raw.

Every build prints the changesets that have no override, newest first, keyed by commit. That
list is the work queue. Scout's `write-changelog-entry` skill appends here and opens a PR.

## Format

```md
## Requests API migrated from v2 to v3

Covers: deadbee, 4711f4b
Type: breaking
Tags: SDK, UI Kit, Hooks

`useRequests` and `useDepositAddressStatus` now call `GET /requests/v3` and return the v3
response shape. Point `baseApiUrl` at a proxy that injects `x-api-key` server-side.
```

| Field    | Required | Notes                                                                                     |
| -------- | -------- | ----------------------------------------------------------------------------------------- |
| `Covers` | ✅       | Changeset commit hashes this replaces, as they appear in the package CHANGELOGs.            |
| `Type`   | ✅       | `breaking`, `deprecated`, `changed`, `added`, `fixed`, or `removed`.                        |
| `Tags`   | ❌       | `SDK`, `UI Kit`, `Hooks`, `Adapters`. Defaults to the packages the covered changesets touch. |
| `Date`   | ❌       | Defaults to the day the last covered release shipped. Set it only to correct that.          |

- The `##` heading is a label for reading this file; it is not published.
- **Package versions and commit links are derived from `Covers`** — never write them into the body, or they will drift from the releases they describe.
- **One override per customer outcome.** A change spanning SDK, UI kit, and hooks is one override naming all three commits.
- Covering a hash claims every bullet that carries it, so a commit with two bullets is fully replaced.
- If `Covers` names a hash the page does not contain, the build warns, skips the override, and the raw text renders. Fix the hash rather than working around it.
- Changesets whose body starts with `[internal]` never publish, so they need no override.

<!-- Overrides below. -->

## Sui support removed

Covers: 4149ded
Type: removed

The SDK and UI kit no longer support Sui. Remove it from any chain configuration you pass in.

## Lighter wallet adapter

Covers: 670737f
Type: added

New `@relayprotocol/relay-lighter-wallet-adapter` package, with the SDK wallet types and
transaction steps needed to execute a route through a Lighter wallet.

## Bitcoin route previews no longer return an error

Covers: 88a63b6, ce4d192
Type: fixed

The placeholder address the SDK uses to price a Bitcoin route before a wallet connects has
been replaced. Previewing a Bitcoin route no longer returns an error.

## Deposit address status reports a depositing step

Covers: 8d8aa50
Type: added

`GET` deposit-address status now reports a `depositing` step, so a client can show that state
while a deposit is in progress.

## `useEOADetection` replaced by `useExplicitDeposit`

Covers: 56123ee
Type: breaking

The UI kit no longer exports `useEOADetection`. `useExplicitDeposit` replaces it — update
your imports if you called the hook directly.

## The SDK and hooks throw Error objects

Covers: 2f0d6de
Type: changed

`useQuote` and the swap and token widgets threw bare strings such as `'Missing a quote'`.
They now throw `Error` objects, so a `catch` block can read `error.message` and error
reporters record a stack. Reading a status code from a failed request no longer throws when
the error carries no response.

## Unhandled async errors no longer stop a Node process

Covers: 7b351ab
Type: fixed

`useExecutionStatus` and the SDK's transaction helpers could leave a promise rejection
unhandled, which terminates a Node process. Server-side rendering and scripted use were
affected. Both now handle the rejection.

## Testnet websocket endpoint

Covers: eab4c8f
Type: added

The SDK exports a testnet websocket endpoint, `wss://ws.testnets.relay.link`, alongside the
mainnet one.

## XRP placeholder address for route previews

Covers: e9dbac1
Type: added

Pricing an XRP route before a wallet connects now works, and `isDeadAddress` recognises the
Tron, Zero, and XRP placeholder addresses alongside the existing ones.

## Base wallet blocked on Robinhood Chain

Covers: a29e409
Type: changed

The Base wallet can no longer send to or receive on Robinhood Chain, which it does not
support.

## Generated API types synced

Covers: fb843c4, a443358, ef54ef1
Type: changed

The SDK's generated API types were regenerated to match the API schema. No runtime behavior
changed.

## Bitcoin wallet adapter dependency updated

Covers: daaae5b
Type: changed

The Bitcoin wallet adapter moved to a newer `bitcoinjs-lib`.

## Exchange address list moved to the Relay asset host

Covers: 4d73aeb
Type: changed

The UI kit fetches its centralized-exchange address list from
`https://assets.relay.link/app/cexAddresses.json` instead of a GitHub raw URL. Update any
host allowlist that covered the old address.

## Requests carry the SDK version

Covers: b86a59d
Type: added

Every request the SDK makes now sends a `relay-sdk-version` header, reporting the client
version or `unknown`.

## TON placeholder address for route previews

Covers: 1fc8190
Type: added

Pricing a TON route before a wallet connects now works, and `isDeadAddress` recognises the
TON placeholder address.

## Solana signatures are validated as base58

Covers: 20db8bc
Type: changed

The Solana wallet adapter checks that the signature a wallet returns is base58 and throws
`Invalid Solana signature: expected base58.` when it is not, instead of passing a malformed
signature on.

## Max reserves an execution buffer on every chain

Covers: c7da389
Type: changed

Selecting the maximum amount now holds back a small execution buffer on every origin chain,
where previously only native-token routes reserved one for fees. The native gas buffer applies
to EVM and SVM origins.

## Fee breakdown reads the quote's expanded price impact

Covers: 6ff1ba6
Type: changed

The widget's fee breakdown reads `details.expandedPriceImpact` from the quote instead of
deriving figures from `fees.relayerService` and `details.swapImpact`, and links to the fee
documentation.

## Hyperliquid USDC pills show the token name

Covers: 22aa1f9
Type: fixed

Hyperliquid's spot and perps USDC both display as `USDC`, so the suggested-token pills were
indistinguishable. They now show the token name on Hyperliquid.

## Hyperliquid destinations reject Abstract Global Wallet recipients

Covers: 00cad1c
Type: changed

Hyperliquid operates like a centralized exchange, so wallet compatibility checks are skipped
for it. Abstract Global Wallet recipients are the exception — they cannot receive a
Hyperliquid deposit and are now rejected.

## EOA detection waits longer before giving up

Covers: 6c804bc, 9cc3fac
Type: changed

EOA detection now allows 2.5 seconds instead of 1 second, so a slow wallet or RPC is less
likely to be misread. The timeout was then reimplemented without any further change in
behavior.

## Token selector reads currency metadata from the API

Covers: f851b3c
Type: changed

The token selector takes its suggested-token metadata from the API's trending currencies and
each chain's `solverCurrencies`, rather than from local storage.

## Deposit address tracking uses the Requests API

Covers: 448ec7c
Type: changed

Deposit-address transaction tracking reads from the Requests API.

## Same-chain option in the chain selector

Covers: 8aa2bca
Type: added

The chain selector accepts a `sameChainOption`, letting a user pick the origin chain as the
destination for a same-chain swap.

## fastFill action

Covers: 0f0ad9f, 7acfaed
Type: added

New `fastFill` action on the SDK, with `FastFillParameters`, `FastFillBody`, and
`FastFillResponse` types. A failed fast fill throws an `APIError` carrying the failure message
and status, including transport failures that never returned a response.

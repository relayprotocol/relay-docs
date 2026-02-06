# Relay Documentation Site

## About This Repository

This is the official documentation site for **Relay**, a multichain payments network that enables fast, low-cost bridging, swapping, and transacting across 85+ blockchain networks. The site is built with [Mintlify](https://mintlify.com) and deployed automatically from the default branch.

**Live site**: [docs.relay.link](https://docs.relay.link)

## About Relay

Relay combines two core components:

- **Cross-chain intents** powered by the Relay Protocol (solver network for instant fills)
- **DEX Meta-Aggregation** across 85+ chains (EVM, Solana, Bitcoin, Sui, Tron, and more)

The Relay stack consists of:

- **Relay App** - Consumer-facing swap interface at [relay.link](https://relay.link)
- **Relay API** - REST + WebSocket API for developers (`https://api.relay.link`)
- **Relay Protocol** - The decentralized network layer (Depository, Oracle, Hub, Vaults)
- **RelayKit** - TypeScript SDK, React hooks, and pre-built UI components

## Repository Structure

```
relay-docs/
├── docs.json              # Mintlify configuration (theme, nav, API settings)
├── index.mdx              # Homepage
├── what-is-relay.mdx      # Product overview
├── solutions/             # Audience-specific docs (wallets, multichain apps, chains)
├── use-cases/             # Use case guides (bridging, swaps, calling)
├── features/              # Feature docs (app fees, fee sponsorship, deposit addresses)
├── security/              # Security & compliance (audits, bounties, MEV protection)
├── resources/             # Supported chains, enterprise, brand assets
├── references/
│   ├── api/               # REST API docs
│   │   ├── api_core_concepts/  # Fees, refunds, errors, step execution
│   │   ├── api_guides/         # Integration guides (bridging, calling, Solana, Bitcoin)
│   │   └── api_resources/      # Contract addresses, supported chains/routes
│   ├── relay-kit/         # Client SDK docs
│   │   ├── sdk/           # TypeScript SDK (createClient, actions, adapters)
│   │   ├── hooks/         # React hooks (useQuote, useRelayChains, etc.)
│   │   └── ui/            # UI components (swap widget, theming)
│   └── protocol/          # Protocol technical docs
│       ├── depository/    # Deposit contracts and architecture
│       ├── oracle/        # Cross-chain verification
│       ├── hub/           # Order tracking
│       └── vaults/        # Liquidity pools and rebalancing
├── snippets/              # Reusable MDX components
├── images/                # Image assets
└── logo/                  # Logo assets
```

## Local Development

Install the Mintlify CLI and start the dev server:

```bash
npm i -g mintlify
mintlify dev
```

The site runs at `http://localhost:3000`. If `mintlify dev` fails, run `mintlify install` to reinstall dependencies.

## Key Configuration

- **`docs.json`** - Main Mintlify config: navigation structure, theme colors, API settings, redirects
- **API spec** - OpenAPI spec is loaded from `https://api.relay.link/documentation/json`
- **Redirects** - 60+ URL redirects are defined at the bottom of `docs.json` for legacy paths

## Publishing

Changes pushed to the default branch auto-deploy to production via the Mintlify GitHub app. Always open a PR for review before merging.

---

# Documentation Writing Standards

## Purpose

This guide ensures consistency, clarity, and quality across all documentation.

---

## Code Snippets

### Language Defaults

- Code snippets should always by default be in Typescript or JavaScript

### Tabs Usage

- Avoid using multiple tabs for code snippets unless it's for showing isolated scenarios/examples

### Length Management

- If a code snippet is longer than 35 lines, add expandable to it

### TypeScript Guidelines

- For TypeScript code snippets, assume that types exist
- Prefer not to write whole types out

## Writing Style & Tone

- Use active voice ("Relay bridges assets" not "Assets are bridged")
- Use imperative for instructions ("Get a quote", "Execute the bridge")
- Keep paragraphs short (2-3 sentences max)

## Heading Hierarchy

- No H1 in body content (frontmatter title serves as H1)
- Use H2 (`##`) for primary sections
- Use H3 (`###`) for subsections
- Avoid going deeper than H3; use bold text for further details

## Callouts & Emphasis

### Callout Components

- Use `<Tip>` for helpful hints and best practices
- Use `<Warning>` for critical warnings
- Use `<Info>` for additional context

### Text Emphasis

- Use **bold** for parameter names, values, and UI elements
- Use `backticks` for code values, endpoints, addresses
- Avoid italics (prefer bold)

## Tables

### Parameter Tables

- Format parameter names as **`parameterName`**
- Keep descriptions concise in table cells
- Add introductory sentence before tables
- Only include Required column (✅/❌) if there are mixed required and optional params
- Note the relevant params and link to the full API reference if available for additional unrelated params

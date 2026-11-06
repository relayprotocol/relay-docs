#!/usr/bin/env node
// Generates the agent-facing chain tables on Supported Chains from the live /chains API.
// The page's <Chains> component renders in the browser only, so without these snippets the
// page's Markdown export (and llms-full.txt) lists no chains at all. The snippets are
// generated; do not edit them by hand.
//
// Usage: node scripts/build-chains.mjs [--check]

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CHECK = process.argv.includes('--check')

const SOURCES = [
  { url: 'https://api.relay.link/chains', out: 'snippets/supported-chains-mainnets.mdx' },
  { url: 'https://api.testnets.relay.link/chains', out: 'snippets/supported-chains-testnets.mdx' }
]

const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').trim()

async function render(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  const { chains } = await response.json()
  if (!Array.isArray(chains) || chains.length === 0) throw new Error(`${url} returned no chains`)

  const rows = chains
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'en') || a.id - b.id)
    .map((chain) => `| ${cell(chain.displayName)} | ${chain.id} | ${cell(chain.vmType)} | ${cell(chain.tokenSupport)} |`)

  return [
    '| Chain | Chain ID | VM type | Supported Tokens |',
    '| --- | --- | --- | --- |',
    ...rows,
    ''
  ].join('\n')
}

let stale = false
for (const { url, out } of SOURCES) {
  const path = join(ROOT, out)
  const next = await render(url)
  let current = null
  try {
    current = readFileSync(path, 'utf8')
  } catch {}
  if (current === next) continue
  if (CHECK) {
    console.error(`${out} is out of date; run node scripts/build-chains.mjs`)
    stale = true
  } else {
    writeFileSync(path, next)
    console.log(`wrote ${out}`)
  }
}
if (stale) process.exit(1)

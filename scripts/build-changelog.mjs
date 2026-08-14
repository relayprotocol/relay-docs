#!/usr/bin/env node
// Generates changelog.mdx by merging three upstream sources into one date-ordered page:
//   API       references/api/changelog.mdx in this repo (hand-authored, "## YYYY-MM-DD — title")
//   RelayKit  packages/*/CHANGELOG.md in relayprotocol/relay-kit, dated by npm publish time
//   App       .changelog/*.md entries in relayprotocol/relay-client
//
// Upstream repos are shallow-cloned from main (https + GITHUB_TOKEN in CI, ssh locally).
// Set RELAY_KIT_DIR / RELAY_CLIENT_DIR to read an existing checkout's working tree instead.
//
// Usage: node scripts/build-changelog.mjs [--check]

import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'changelog.mdx')
const API_CHANGELOG = join(ROOT, 'references', 'api', 'changelog.mdx')

// Unset means the full history of every source. At ~272 days the deployed page is 113KB
// gzipped and ~10.4k DOM elements; see AGENTS.md §4.6 before letting it grow much further.
const SINCE = process.env.CHANGELOG_SINCE ?? '0000-00-00'
const CHECK = process.argv.includes('--check')

// relay-kit is public, so the commit hash changesets records on each bullet can be linked.
// Its changesets config is `@changesets/cli/changelog`, which writes a bare hash rather than
// the PR/commit links `@changesets/changelog-github` would produce — hence building the URL
// here. The commit page names the PR it came from, so one link covers both.
const RELAY_KIT_COMMIT_URL = 'https://github.com/relayprotocol/relay-kit/commit'

const SECTION_ORDER = ['API', 'RelayKit', 'App']
const TAG_ORDER = ['API', 'SDK', 'UI Kit', 'Hooks', 'Adapters', 'App']

// Change-type groups within a day's API and App sections, most consequential first.
// Types not listed here still render, after these, in the order they first appear.
const CHANGE_TYPE_ORDER = ['Breaking', 'Deprecated', 'Behavior change', 'Added', 'Changed', 'Fixed', 'Removed']

// `tag` drives the Update's filter tags; `label` is the display name in the RelayKit section.
const RELAY_KIT_PACKAGES = [
  { dir: 'sdk', npm: '@relayprotocol/relay-sdk', tag: 'SDK', label: 'SDK' },
  { dir: 'ui', npm: '@relayprotocol/relay-kit-ui', tag: 'UI Kit', label: 'UI Kit' },
  { dir: 'hooks', npm: '@relayprotocol/relay-kit-hooks', tag: 'Hooks', label: 'Hooks' },
  {
    dir: 'relay-bitcoin-wallet-adapter',
    npm: '@relayprotocol/relay-bitcoin-wallet-adapter',
    tag: 'Adapters',
    label: 'Bitcoin adapter'
  },
  {
    dir: 'relay-ethers-wallet-adapter',
    npm: '@relayprotocol/relay-ethers-wallet-adapter',
    tag: 'Adapters',
    label: 'Ethers adapter'
  },
  {
    dir: 'relay-lighter-wallet-adapter',
    npm: '@relayprotocol/relay-lighter-wallet-adapter',
    tag: 'Adapters',
    label: 'Lighter adapter'
  },
  {
    dir: 'relay-svm-wallet-adapter',
    npm: '@relayprotocol/relay-svm-wallet-adapter',
    tag: 'Adapters',
    label: 'SVM adapter'
  },
  {
    dir: 'relay-ton-wallet-adapter',
    npm: '@relayprotocol/relay-ton-wallet-adapter',
    tag: 'Adapters',
    label: 'TON adapter'
  },
  {
    dir: 'relay-tron-wallet-adapter',
    npm: '@relayprotocol/relay-tron-wallet-adapter',
    tag: 'Adapters',
    label: 'Tron adapter'
  }
]

const APP_CHANGE_TYPES = {
  added: 'Added',
  changed: 'Changed',
  fixed: 'Fixed',
  breaking: 'Breaking',
  deprecated: 'Deprecated',
  removed: 'Removed'
}

const warnings = []
const clones = []

process.on('exit', () => {
  for (const dir of clones) rmSync(dir, { recursive: true, force: true })
})

function warn(message) {
  warnings.push(message)
  console.warn(`warn: ${message}`)
}

function resolveRepo(name, envVar) {
  const fromEnv = process.env[envVar]
  if (fromEnv) {
    if (!existsSync(fromEnv)) throw new Error(`${envVar} points at a missing path: ${fromEnv}`)
    warn(`${envVar} is set — reading ${name} from the working tree at ${fromEnv}, which may not match main`)
    return fromEnv
  }

  const token = process.env.GITHUB_TOKEN
  if (!token && process.env.CI) {
    throw new Error(`GITHUB_TOKEN is empty — CI cannot clone ${name} over ssh. Check CHANGELOG_SOURCES_TOKEN.`)
  }

  const url = token
    ? `https://x-access-token:${token}@github.com/relayprotocol/${name}.git`
    : `git@github.com:relayprotocol/${name}.git`
  const parent = mkdtempSync(join(tmpdir(), 'relay-changelog-'))
  clones.push(parent)
  const target = join(parent, name)
  execFileSync('git', ['clone', '--quiet', '--depth=1', '--filter=blob:none', url, target], { stdio: 'inherit' })
  return target
}

// A failed lookup must not fall through to "this package has no releases" — that would
// delete its history from the page and commit the deletion. Retry, then give up loudly.
async function registryDates(pkg) {
  const url = `https://registry.npmjs.org/${pkg.replace('/', '%2F')}`

  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) return {}
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const { time } = await res.json()
      if (!time) throw new Error('response has no "time" field')

      return Object.fromEntries(
        Object.entries(time)
          .filter(([version]) => version !== 'created' && version !== 'modified')
          .map(([version, iso]) => [version, iso.slice(0, 10)])
      )
    } catch (error) {
      if (attempt === 3) throw new Error(`npm registry lookup failed for ${pkg}: ${error.message}`)
      await new Promise((resolve) => setTimeout(resolve, attempt * 500))
    }
  }
}

// Versions before the 2025-08-16 rename were published under @reservoir0x, so dating the
// full CHANGELOG needs both scopes. A version in both keeps its first publish date.
async function npmPublishDates(pkg) {
  const [current, legacy] = await Promise.all([
    registryDates(pkg),
    registryDates(pkg.replace('@relayprotocol/', '@reservoir0x/'))
  ])

  const dates = { ...legacy }
  for (const [version, date] of Object.entries(current)) {
    if (!dates[version] || date < dates[version]) dates[version] = date
  }
  return dates
}

// "## 2026-08-13 — Solana quote size check returns `SOLANA_TX_TOO_LARGE`" + body until the next ##
function parseApiChangelog(markdown) {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, '')
  const entries = []
  const pattern = /^## (\d{4}-\d{2}-\d{2})\s*—\s*(.+)$/gm
  const matches = [...body.matchAll(pattern)]

  matches.forEach((match, index) => {
    const start = match.index + match[0].length
    const end = index + 1 < matches.length ? matches[index + 1].index : body.length
    // Source anchors are "#<date>-<slug>"; Mintlify gives each Update an id of just the
    // date, so trimming the slug keeps cross-references on this page.
    const entryBody = body
      .slice(start, end)
      .trim()
      .replace(/\]\(#(\d{4}-\d{2}-\d{2})[^)]*\)/g, '](#$1)')
    entries.push({
      date: match[1],
      section: 'API',
      tag: 'API',
      title: match[2].trim(),
      items: splitChangeTypes(entryBody, `API entry "${match[2].trim()}"`)
    })
  })

  return entries
}

// Bodies are paragraphs led by a bolded change type: "**Added** — <what changed>".
// A paragraph without a lead continues the change above it.
function splitChangeTypes(body, source) {
  const items = []

  for (const paragraph of body.split(/\n{2,}/)) {
    const lead = paragraph.match(/^\*\*([^*]+)\*\*\s*—\s*([\s\S]+)$/)
    if (lead) {
      items.push({ type: lead[1].trim(), text: lead[2].trim() })
      continue
    }
    if (items.length === 0) {
      warn(`${source} opens with a paragraph that has no bolded change-type lead — grouped under "Other"`)
      items.push({ type: 'Other', text: paragraph.trim() })
      continue
    }
    items.at(-1).text += `\n\n${paragraph.trim()}`
  }

  return items
}

// Changesets format: "## <version>" → "### Major|Minor|Patch Changes" → "- <hash>: <text>"
function parseChangesetChangelog(markdown) {
  const releases = []
  const lines = markdown.split('\n')
  let release = null
  let kind = null
  let bullet = null
  let commit = null

  const flushBullet = () => {
    if (!bullet) return
    const text = bullet.join('\n').trimEnd()
    if (text && !/^Updated dependencies\b/.test(text)) release.changes.push({ kind, text, commit })
    bullet = null
    commit = null
  }

  for (const line of lines) {
    const version = line.match(/^## (\d+\.\d+\.\d+.*)$/)
    if (version) {
      flushBullet()
      release = { version: version[1].trim(), changes: [] }
      releases.push(release)
      kind = null
      continue
    }
    if (!release) continue

    const heading = line.match(/^### (Major|Minor|Patch) Changes$/)
    if (heading) {
      flushBullet()
      kind = heading[1]
      continue
    }

    if (/^- /.test(line)) {
      flushBullet()
      const body = line.replace(/^- /, '')
      const hash = body.match(/^([0-9a-f]{7,40}): /)
      commit = hash ? hash[1] : null
      bullet = [hash ? body.slice(hash[0].length) : body]
      continue
    }

    // Everything up to the next bullet or heading continues the current one. Requiring an
    // indent here would silently drop lazily-continued, tab-indented, and single-space
    // lines, truncating the release note mid-sentence.
    if (bullet) bullet.push(line.replace(/^(\t| {1,2})/, ''))
  }

  flushBullet()
  return releases.filter((entry) => entry.changes.length > 0)
}

function parseAppEntry(filename, raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) {
    warn(`relay-client .changelog/${filename} has no frontmatter — skipped`)
    return null
  }

  const meta = {}
  for (const line of match[1].split('\n')) {
    const field = line.match(/^([A-Za-z_]+):\s*(.*)$/)
    if (field) meta[field[1]] = field[2].trim().replace(/^["']|["']$/g, '')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '')) {
    warn(`relay-client .changelog/${filename} has a missing or malformed date — skipped`)
    return null
  }

  const type = (meta.type ?? 'changed').toLowerCase()
  if (!APP_CHANGE_TYPES[type]) {
    warn(`relay-client .changelog/${filename} has an unrecognized type "${type}" — skipped`)
    return null
  }

  const body = match[2].trim()
  if (!body) {
    warn(`relay-client .changelog/${filename} has an empty body — skipped`)
    return null
  }

  return {
    date: meta.date,
    section: 'App',
    tag: 'App',
    items: [{ type: APP_CHANGE_TYPES[type], text: escapeMdx(body) }]
  }
}

async function collectRelayKitEntries(repoDir) {
  const entries = []

  for (const pkg of RELAY_KIT_PACKAGES) {
    const path = join(repoDir, 'packages', pkg.dir, 'CHANGELOG.md')
    if (!existsSync(path)) {
      warn(`relay-kit is missing packages/${pkg.dir}/CHANGELOG.md — skipped`)
      continue
    }

    const dates = await npmPublishDates(pkg.npm)
    // Canary builds (0.0.0-canary-*) are published to npm but are not releases a reader
    // could install, so no prerelease version reaches the page.
    const releases = parseChangesetChangelog(readFileSync(path, 'utf8')).filter(
      (release) => !release.version.includes('-')
    )

    if (releases.length > 0 && Object.keys(dates).length === 0) {
      throw new Error(`no npm publish dates for ${pkg.npm} — refusing to drop its history from the page`)
    }

    // An undated version above the newest dated one is unpublished or a failed publish —
    // worth flagging, unlike the pre-rename versions further down the file.
    const newestDated = releases.findIndex((release) => dates[release.version])
    const unpublished = newestDated === -1 ? releases : releases.slice(0, newestDated)
    if (unpublished.length > 0) {
      warn(`${pkg.npm} has no npm publish date for ${unpublished.map((r) => r.version).join(', ')} — skipped`)
    }

    for (const release of releases) {
      const date = dates[release.version]
      if (!date) continue
      if (date < SINCE) continue
      entries.push({
        date,
        section: 'RelayKit',
        tag: pkg.tag,
        label: pkg.label,
        version: release.version,
        changes: release.changes
      })
    }
  }

  return entries
}

function collectAppEntries(repoDir) {
  const dir = join(repoDir, '.changelog')
  if (!existsSync(dir)) {
    warn('relay-client has no .changelog directory — the App section will be empty')
    return []
  }

  return readdirSync(dir)
    .filter((file) => file.endsWith('.md') && file !== 'README.md')
    .map((file) => parseAppEntry(file, readFileSync(join(dir, file), 'utf8')))
    .filter((entry) => entry !== null && entry.date >= SINCE)
}

// Upstream text is plain markdown, so a stray `<` or `{` would break the MDX build. Fenced
// blocks are split off first — escaping inside one renders the backslashes literally.
function escapeMdx(text) {
  return text
    .split(/(```[\s\S]*?```)/)
    .map((block, blockIndex) =>
      blockIndex % 2 === 1
        ? block
        : block
            .split(/(`[^`\n]*`)/)
            .map((part, index) => (index % 2 === 1 ? part : part.replace(/[<{]/g, '\\$&')))
            .join('')
    )
    .join('')
}

// The link belongs on the summary line, not after any nested bullets that follow it.
function withCommitLink(text, commit) {
  if (!commit) return text
  const [summary, ...rest] = text.split('\n')
  return [`${summary} ([\`${commit}\`](${RELAY_KIT_COMMIT_URL}/${commit}))`, ...rest].join('\n')
}

function indentBullet(text) {
  return text
    .split('\n')
    .map((line, index) => (index === 0 ? `- ${line}` : line.trim() === '' ? '' : `  ${line}`))
    .join('\n')
}

function compareVersions(a, b) {
  const parse = (version) => {
    const [core, prerelease] = version.split('-', 2)
    return {
      core: core.split('.').map(Number),
      // Absent prerelease outranks any prerelease: 1.2.0 > 1.2.0-beta.1.
      prerelease: prerelease ? prerelease.split('.').map((part) => (/^\d+$/.test(part) ? Number(part) : part)) : null
    }
  }

  const left = parse(a)
  const right = parse(b)

  for (let i = 0; i < 3; i++) {
    if (left.core[i] !== right.core[i]) return left.core[i] < right.core[i] ? -1 : 1
  }

  if (!left.prerelease && !right.prerelease) return 0
  if (!left.prerelease) return 1
  if (!right.prerelease) return -1

  for (let i = 0; i < Math.max(left.prerelease.length, right.prerelease.length); i++) {
    const l = left.prerelease[i]
    const r = right.prerelease[i]
    if (l === r) continue
    if (l === undefined) return -1
    if (r === undefined) return 1
    return l < r ? -1 : 1
  }
  return 0
}

// A day's changes are grouped by change type rather than by source entry, so the
// whole day's additions read together and its behavior changes read together.
function renderTypeGroups(entries) {
  const groups = new Map()
  for (const item of entries.flatMap((entry) => entry.items)) {
    if (!groups.has(item.type)) groups.set(item.type, [])
    groups.get(item.type).push(item.text)
  }

  const known = CHANGE_TYPE_ORDER.filter((type) => groups.has(type))
  const rest = [...groups.keys()].filter((type) => !CHANGE_TYPE_ORDER.includes(type))

  return [...known, ...rest]
    .map((type) => {
      const bullets = groups.get(type).map(indentBullet)
      return `**${type}**\n\n${bullets.join('\n')}`
    })
    .join('\n\n')
}

// One changeset lands in every package it touches, so the same text repeats across
// CHANGELOGs on the same day. Collapse it into a single item naming each package.
function renderRelayKit(entries) {
  const groups = new Map()

  for (const entry of entries) {
    for (const change of entry.changes) {
      const key = `${change.kind} ${change.text}`
      if (!groups.has(key)) {
        groups.set(key, { kind: change.kind, text: change.text, commit: change.commit, packages: new Map() })
      }
      // A package can publish twice in a day; credit the newest version carrying the change.
      const seen = groups.get(key).packages.get(entry.label)
      if (!seen || compareVersions(entry.version, seen) > 0) groups.get(key).packages.set(entry.label, entry.version)
    }
  }

  return [...groups.values()]
    .map((group) => {
      const packages = [...group.packages].map(([label, version]) => `${label} \`${version}\``)
      const body = indentBullet(withCommitLink(escapeMdx(group.text), group.commit))
      return `**${packages.join(', ')}** — ${group.kind}\n\n${body}`
    })
    .join('\n\n')
}

function renderPage(entries) {
  const byDate = new Map()
  for (const entry of entries) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, [])
    byDate.get(entry.date).push(entry)
  }

  const days = [...byDate.keys()].sort().reverse()
  const blocks = days.map((date) => {
    const dayEntries = byDate.get(date)
    const sections = SECTION_ORDER.filter((section) => dayEntries.some((entry) => entry.section === section)).map(
      (section) => {
        const scoped = dayEntries.filter((entry) => entry.section === section)
        if (section === 'RelayKit') return `### RelayKit\n\n${renderRelayKit(scoped)}`
        return `### ${section}\n\n${renderTypeGroups(scoped)}`
      }
    )

    // Mintlify renders these tags under the date; script.js makes them the filter control.
    const dayTags = new Set(dayEntries.map((entry) => entry.tag))
    const tagProp = TAG_ORDER.filter((tag) => dayTags.has(tag))
      .map((tag) => `"${tag}"`)
      .join(', ')
    return `<Update label="${date}" tags={[${tagProp}]}>\n\n${sections.join('\n\n')}\n\n</Update>`
  })

  const frontmatter = [
    '---',
    'title: "Changelog"',
    'description: "Record of new endpoints, breaking changes, deprecations, and default-behavior changes across Relay products"',
    'rss: true',
    // The tab holds this page alone, so drop the one-item sidebar and the TOC.
    'mode: "center"',
    '---',
    '',
    '{/* Generated by scripts/build-changelog.mjs — do not edit by hand. */}',
    ''
  ].join('\n')

  return `${frontmatter}\n${blocks.join('\n\n')}\n`
}

const relayKitDir = resolveRepo('relay-kit', 'RELAY_KIT_DIR')
const relayClientDir = resolveRepo('relay-client', 'RELAY_CLIENT_DIR')

const entries = [
  ...parseApiChangelog(readFileSync(API_CHANGELOG, 'utf8')).filter((entry) => entry.date >= SINCE),
  ...(await collectRelayKitEntries(relayKitDir)),
  ...collectAppEntries(relayClientDir)
]

const page = renderPage(entries)

if (CHECK) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (current !== page) {
    console.error('changelog.mdx is out of date — run: node scripts/build-changelog.mjs')
    process.exit(1)
  }
  console.log('changelog.mdx is up to date')
} else {
  writeFileSync(OUT, page)
  console.log(`wrote ${OUT} — ${entries.length} entries across ${new Set(entries.map((e) => e.date)).size} days`)
}

if (warnings.length > 0) console.warn(`${warnings.length} warning(s)`)

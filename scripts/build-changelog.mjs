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
// Editorial layer for the RelayKit line: customer-facing entries that supersede the
// changeset text they name in `covers`. Written by hand or by Scout's write-changelog-entry
// skill, reviewed in a PR. Anything not covered still renders verbatim from upstream.
const OVERRIDES = join(ROOT, '.changelog', 'relay-kit-overrides.md')

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
const TAG_ORDER = ['API', 'RelayKit', 'SDK', 'UI Kit', 'Hooks', 'Adapters', 'App']

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

// `2026-02-30` matches the shape but is not a day. Date.UTC rolls it over to March 2, so a
// round-trip through the parsed components is what catches it.
function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
  )
}

function warn(message) {
  warnings.push(message)
  console.warn(`warn: ${message}`)
}

function resolveRepo(name, envVar, { history = false } = {}) {
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
  // Dating reads each CHANGELOG's commit history, so that repo needs a full clone (17MB,
  // ~3s for relay-kit). Everything else only needs the tip.
  const shallow = history ? [] : ['--depth=1', '--filter=blob:none']
  execFileSync('git', ['clone', '--quiet', ...shallow, url, target], { stdio: 'inherit' })
  return target
}

// A release is dated by the commit that added its section to the package CHANGELOG — the
// "Version Packages" merge, which is what triggers publishing. That needs nothing but the
// clone: no registry, and unlike version tags it covers every release in the file.
function changelogDates(repoDir, relPath) {
  const marker = '__COMMIT__'
  const output = execFileSync('git', ['log', `--format=${marker}%cs`, '-p', '--', relPath], {
    cwd: repoDir,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024
  })

  const dates = new Map()
  let date = null
  for (const line of output.split('\n')) {
    if (line.startsWith(marker)) {
      date = line.slice(marker.length).trim()
      continue
    }
    // Newest commit first, so the first sighting of an added heading wins.
    const added = line.match(/^\+## (\d+\.\d+\.\d+\S*)\s*$/)
    if (added && date && !dates.has(added[1])) dates.set(added[1], date)
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
    if (!isCalendarDate(match[1])) {
      warn(`API changelog entry dated "${match[1]}" is not a real date — skipped`)
      return
    }
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
      // Escaped like every other source: a `{template}` in prose is an MDX expression, and
      // the source file is no longer built as a page to catch it (see .mintignore).
      items: splitChangeTypes(escapeMdx(entryBody), `API entry "${match[2].trim()}"`)
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
    // "[internal]" is relay-kit's marker for a change with no customer-visible effect.
    const publishable = text && !/^Updated dependencies\b/.test(text) && !/^\[internal\]/i.test(text)
    if (publishable) release.changes.push({ kind, text, commit })
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
      const withoutHash = hash ? body.slice(hash[0].length) : body
      bullet = [withoutHash.replace(/^(feat|fix|chore|refactor|docs|test|ci|build|perf|style)(\([^)]*\))?!?:\s*/i, '')]
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

  if (!isCalendarDate(meta.date)) {
    warn(`relay-client .changelog/${filename} has a missing or impossible date "${meta.date ?? ''}" — skipped`)
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

// Overrides supersede the changeset text they name in `Covers:`. Everything else publishes
// raw, so this file only has to hold the entries worth rewriting.
function collectOverrides() {
  if (!existsSync(OVERRIDES)) {
    warn(`no override file at ${OVERRIDES} — every RelayKit changeset will publish raw`)
    return []
  }

  const body = readFileSync(OVERRIDES, 'utf8')
  // Blank fenced blocks, preserving length, so a `##` inside the file's own format example
  // is not read as a heading.
  const scan = body.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, ' '))
  const matches = [...scan.matchAll(/^## (.+)$/gm)]

  return matches
    .map((match, index) => {
      const title = match[1].trim()
      const from = match.index + match[0].length
      const to = index + 1 < matches.length ? matches[index + 1].index : body.length
      const section = body.slice(from, to).trim()
      // Fields are read from a fence-free copy for the same reason, but the body keeps its
      // fences so an entry can contain a code block.
      const fieldSource = section.replace(/```[\s\S]*?```/g, '')

      let text = section
      const field = (name) => {
        const found = fieldSource.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))
        if (!found) return null
        text = text.replace(found[0], '')
        return found[1].trim()
      }

      const covers = (field('Covers') ?? '')
        .split(',')
        .map((hash) => hash.trim())
        .filter(Boolean)
      const type = (field('Type') ?? '').toLowerCase()
      const declaredTags = (field('Tags') ?? '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      const date = field('Date')

      // A section with no Covers: is prose in this file's own header, not an override.
      if (covers.length === 0) return null

      if (!APP_CHANGE_TYPES[type]) {
        warn(`override "${title}" has a missing or unrecognized Type: "${type}" — skipped`)
        return null
      }
      if (date && !isCalendarDate(date)) {
        warn(`override "${title}" has an impossible Date: "${date}" — skipped`)
        return null
      }

      text = text.trim()
      if (!text) {
        warn(`override "${title}" has an empty body — skipped`)
        return null
      }

      return { title, covers, kind: APP_CHANGE_TYPES[type], declaredTags, date, body: text }
    })
    .filter(Boolean)
}

function collectRelayKitEntries(repoDir, overrides) {

  const entries = []
  const rawQueue = []
  const covered = new Map(overrides.flatMap((entry) => entry.covers.map((hash) => [hash, []])))

  for (const pkg of RELAY_KIT_PACKAGES) {
    const path = join(repoDir, 'packages', pkg.dir, 'CHANGELOG.md')
    if (!existsSync(path)) {
      warn(`relay-kit is missing packages/${pkg.dir}/CHANGELOG.md — skipped`)
      continue
    }

    // Canary builds (0.0.0-canary-*) are published to npm but are not releases a reader
    // could install, so no prerelease version reaches the page.
    const dates = changelogDates(repoDir, `packages/${pkg.dir}/CHANGELOG.md`)
    const releases = parseChangesetChangelog(readFileSync(path, 'utf8')).filter(
      (release) => !release.version.includes('-')
    )


    // An undated version above the newest dated one is unpublished or a failed publish —
    // worth flagging, unlike the pre-rename versions further down the file.
    const newestDated = releases.findIndex((release) => dates.get(release.version))
    const unpublished = newestDated === -1 ? releases : releases.slice(0, newestDated)
    if (unpublished.length > 0) {
      warn(`${pkg.npm} has no dated release for ${unpublished.map((r) => r.version).join(', ')} — skipped`)
    }

    for (const release of releases) {
      const date = dates.get(release.version)
      if (!date) continue
      if (date < SINCE) continue

      // An override owns the outcome, so the changesets it covers must not also render raw.
      const changes = release.changes.filter((change) => {
        if (!change.commit || !covered.has(change.commit)) return true
        covered.get(change.commit).push({ label: pkg.label, version: release.version, date })
        return false
      })
      if (changes.length === 0) continue

      for (const change of changes) {
        rawQueue.push({ date, commit: change.commit, label: pkg.label, version: release.version })
      }

      entries.push({
        date,
        section: 'RelayKit',
        tag: pkg.tag,
        label: pkg.label,
        version: release.version,
        changes
      })
    }
  }

  for (const entry of overrides) {
    const packages = entry.covers.flatMap((hash) => covered.get(hash))
    if (packages.length === 0) {
      warn(`override "${entry.title}" covers no changeset on this page (${entry.covers.join(', ')}) — skipped, raw text still renders`)
      continue
    }

    // An override lands on the day its last covered release shipped unless it says otherwise.
    const date = entry.date ?? packages.map((p) => p.date).sort().at(-1)
    if (date < SINCE) continue

    // Versions and links come from the changesets the entry claims, never hand-typed.
    const versions = new Map()
    for (const { label, version } of packages) {
      if (!versions.has(label) || compareVersions(version, versions.get(label)) > 0) versions.set(label, version)
    }
    const tags = new Set(
      packages.map((p) => RELAY_KIT_PACKAGES.find((pkg) => pkg.label === p.label).tag)
    )

    const finalTags = entry.declaredTags.length > 0 ? entry.declaredTags : [...tags]
    entries.push({
      date,
      section: 'RelayKit',
      tag: finalTags[0],
      extraTags: finalTags.slice(1),
      editorial: {
        kind: entry.kind,
        body: escapeMdx(entry.body),
        versions: [...versions].map(([label, version]) => `${label} \`${version}\``),
        commits: entry.covers.filter((hash) => covered.get(hash).length > 0)
      }
    })
  }

  // One changeset spans every package it touched, so the queue is keyed by commit — the unit
  // an override covers. This list is the work queue for writing overrides; nothing needs to
  // track a last-synced cursor.
  const byCommit = new Map()
  for (const item of rawQueue) {
    const key = item.commit ?? `${item.date} ${item.label} ${item.version}`
    if (!byCommit.has(key)) byCommit.set(key, { ...item, packages: [] })
    byCommit.get(key).packages.push(`${item.label} \`${item.version}\``)
  }

  const queue = [...byCommit.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
  const coveredCount = [...covered.values()].filter((p) => p.length > 0).length
  console.log(`RelayKit: ${coveredCount} changeset(s) rewritten by overrides, ${queue.length} publishing raw`)

  const shown = queue.slice(0, 15)
  if (shown.length > 0) {
    console.log(`  publishing raw, newest first — override candidates${queue.length > shown.length ? ` (showing ${shown.length} of ${queue.length})` : ''}:`)
    for (const item of shown) {
      console.log(`    ${item.date}  ${item.commit ?? '(no commit)'}  ${item.packages.join(', ')}`)
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

// Editorial entries lead the section, in the same change-type grouping the API line uses.
// Their version list and commit links are derived from the changesets they cover.
function renderEditorial(entries) {
  const groups = new Map()
  for (const { editorial } of entries) {
    if (!groups.has(editorial.kind)) groups.set(editorial.kind, [])
    groups.get(editorial.kind).push(editorial)
  }

  const known = CHANGE_TYPE_ORDER.filter((kind) => groups.has(kind))
  const rest = [...groups.keys()].filter((kind) => !CHANGE_TYPE_ORDER.includes(kind))

  return [...known, ...rest]
    .map((kind) => {
      const bullets = groups.get(kind).map((item) => {
        const links = item.commits.map((hash) => `[\`${hash}\`](${RELAY_KIT_COMMIT_URL}/${hash})`).join(', ')
        // Bodies are hard-wrapped, so the attribution goes after the first paragraph rather
        // than the first line, which would land mid-sentence.
        const [lead, ...rest] = item.body.split(/\n{2,}/)
        const attributed = `${lead.trimEnd()} — ${item.versions.join(', ')} (${links})`
        return indentBullet([attributed, ...rest].join('\n\n'))
      })
      return `**${kind}**\n\n${bullets.join('\n')}`
    })
    .join('\n\n')
}

function renderRelayKit(entries) {
  const blocks = []
  const editorial = entries.filter((entry) => entry.editorial)
  const verbatim = entries.filter((entry) => entry.changes)
  if (editorial.length > 0) blocks.push(renderEditorial(editorial))
  if (verbatim.length > 0) blocks.push(renderVerbatim(verbatim))
  return blocks.join('\n\n')
}

// One changeset lands in every package it touches, so the same text repeats across
// CHANGELOGs on the same day. Collapse it into a single item naming each package.
function renderVerbatim(entries) {
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
    const dayTags = new Set(dayEntries.flatMap((entry) => [entry.tag, ...(entry.extraTags ?? [])]))
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

const relayKitDir = resolveRepo('relay-kit', 'RELAY_KIT_DIR', { history: true })
const relayClientDir = resolveRepo('relay-client', 'RELAY_CLIENT_DIR')

const overrides = collectOverrides()

const entries = [
  ...parseApiChangelog(readFileSync(API_CHANGELOG, 'utf8')).filter((entry) => entry.date >= SINCE),
  ...collectRelayKitEntries(relayKitDir, overrides),
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

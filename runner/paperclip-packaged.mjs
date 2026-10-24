import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { reserveReleased } from '../scripts/paperclip-reserve-released.mjs'

const [variant, fork, outArg] = process.argv.slice(2)
if (!['published', 'override', 'built-unchanged', 'built-fork'].includes(variant) || !fork || !outArg) {
  console.error('usage: node runner/paperclip-packaged.mjs published|override|built-unchanged|built-fork <fork version> <out dir>')
  process.exit(2)
}

const target = JSON.parse(readFileSync(new URL('../targets/paperclip.json', import.meta.url), 'utf8'))
const paperclip = target.tag.replace(/^v/, '')
const built = variant.startsWith('built-')
const install = built ? paperclip + '-compat.0' : paperclip
const out = resolve(outArg)
mkdirSync(out, { recursive: true })
const app = mkdtempSync(join(process.env.RUNNER_TEMP || tmpdir(), 'paperclip-packaged-'))
const database = process.env.TEST_DATABASE_URL
const steps = {}
const tests = {}

const manifest = { name: 'paperclip-packaged-check', private: true, dependencies: { paperclipai: install } }
if (variant === 'override')
  manifest.overrides = { postgres: 'npm:@steadybrew/postgresjs@' + fork }
writeFileSync(join(app, 'package.json'), JSON.stringify(manifest, null, 1) + '\n')
if (built)
  writeFileSync(join(app, '.npmrc'), 'registry=http://localhost:4873/\n')

const log = join(out, 'install.log')
const fd = openSync(log, 'w')
const installed = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: app, stdio: ['ignore', fd, fd], timeout: 30 * 60_000 })
closeSync(fd)
steps.install = { status: installed.status === 0 ? 'passed' : 'failed', exit: installed.status }
console.log('install', steps.install.status)
if (installed.status !== 0)
  console.log(readFileSync(log, 'utf8').split('\n').slice(-60).join('\n'))

const packageRoot = file => {
  for (let dir = dirname(file); dir !== dirname(dir); dir = dirname(dir)) {
    const path = join(dir, 'package.json')
    if (existsSync(path) && JSON.parse(readFileSync(path, 'utf8')).name)
      return dir
  }
}

const driver = from => {
  const dir = packageRoot(createRequire(join(from, 'package.json')).resolve('postgres'))
  const { name, version } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const patched = ['src/index.js', 'cjs/src/index.js'].filter(f => existsSync(join(dir, f)) && readFileSync(join(dir, f), 'utf8').includes("Errors.connection('CONNECTION_RELEASED'"))
  return { id: name + '@' + version, path: relative(app, dir), patched }
}

const entries = []
if (steps.install.status === 'passed') {
  for (const name of ['paperclipai', '@paperclipai/server', '@paperclipai/db']) {
    const found = JSON.parse(execFileSync('npm', ['query', '[name="' + name + '"]'], { cwd: app, encoding: 'utf8', maxBuffer: 1 << 26 }))
    for (const { location, version } of found) {
      const dir = join(app, location)
      const declares = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).dependencies?.postgres || null
      let resolved
      try {
        resolved = driver(dir)
      } catch (error) {
        resolved = { error: error.code || error.message }
      }
      entries.push({ name, version, location, declares, driver: resolved })
    }
  }
  steps.entries = { status: entries.some(e => e.name === '@paperclipai/db' && e.driver.id) ? 'passed' : 'failed' }
}

const fixtureUrl = 'https://raw.githubusercontent.com/paperclipai/paperclip/' + target.ref + '/packages/db/src/__fixtures__/postgres-connection-recovery.mjs'
let fixture = null
if (steps.entries?.status === 'passed') {
  const db = entries.find(e => e.name === '@paperclipai/db')
  const response = await fetch(fixtureUrl)
  const source = await response.text()
  steps.fixture = { status: response.ok ? 'passed' : 'failed', http: response.status }
  fixture = { url: fixtureUrl, sha256: createHash('sha256').update(source).digest('hex'), path: join(db.location, 'compat-fixtures', 'postgres-connection-recovery.mjs') }
  mkdirSync(dirname(join(app, fixture.path)), { recursive: true })
  writeFileSync(join(app, fixture.path), response.ok && ['override', 'built-fork'].includes(variant) ? reserveReleased(source) : source)
}

if (steps.fixture?.status === 'passed') {
  for (const format of ['esm', 'cjs']) {
    for (const scenario of ['transaction', 'transaction-closed', 'savepoint', 'reserve', 'transaction-queue', 'reserve-queue']) {
      const title = format + ': rejects disconnected ' + scenario + ' work and recovers the pool'
      const result = spawnSync(process.execPath, [join(app, fixture.path)], {
        env: { ...process.env, TEST_DATABASE_URL: database, DRIVER_FORMAT: format, RECOVERY_CASE: scenario },
        encoding: 'utf8',
        timeout: 15_000
      })
      tests[title] = result.status === 0 && result.stdout.trim() === 'recovered' && result.stderr === '' ? 'passed' : 'failed'
      writeFileSync(join(out, format + '-' + scenario + '.log'), 'exit ' + result.status + ' signal ' + result.signal + '\n--- stdout\n' + result.stdout + '\n--- stderr\n' + result.stderr)
      console.log(tests[title], title)
    }
  }
}

writeFileSync(join(out, 'result.json'), JSON.stringify({
  variant,
  paperclip,
  install: 'paperclipai@' + install + (built ? ' from the local registry' : ' from npm'),
  ref: target.ref,
  fork: ['override', 'built-fork'].includes(variant) ? fork : null,
  node: process.version,
  manifest,
  steps,
  entries,
  fixture,
  tests
}, null, 1) + '\n')

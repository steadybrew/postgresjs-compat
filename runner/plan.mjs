import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'

const view = spec => execFileSync('npm', ['view', spec, 'version'], { encoding: 'utf8' }).trim()

const version = view('@steadybrew/postgresjs@' + (process.env.VERSION || 'latest'))
if (!version)
  throw new Error('@steadybrew/postgresjs@' + process.env.VERSION + ' is not on npm')
const migrate = view('@steadybrew/postgresjs-migrate@latest')

const upstream = process.env.UPSTREAM ? view('postgres@' + process.env.UPSTREAM) : ''
if (process.env.UPSTREAM && !upstream)
  throw new Error('postgres@' + process.env.UPSTREAM + ' is not on npm')

const upstreamRepo = 'https://github.com/porsager/postgres.git'
const resolveRef = ref => {
  if (/^[0-9a-f]{40}$/.test(ref))
    return ref
  const refs = execFileSync('git', ['ls-remote', upstreamRepo, ref, ref + '^{}'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean).map(line => line.split('\t'))
  const match = refs.find(([, name]) => name.endsWith('^{}')) || refs[0]
  if (!match)
    throw new Error(ref + ' is not a branch or tag of ' + upstreamRepo)
  return match[0]
}
const upstreamSha = process.env.UPSTREAM_REF ? resolveRef(process.env.UPSTREAM_REF) : ''
let upstreamShaVersion = ''
if (upstreamSha) {
  const response = await fetch('https://raw.githubusercontent.com/porsager/postgres/' + upstreamSha + '/package.json')
  if (!response.ok)
    throw new Error('no package.json at porsager/postgres ' + upstreamSha + ': HTTP ' + response.status)
  upstreamShaVersion = (await response.json()).version
}
const extra = [upstream && 'upstream', upstreamSha && 'upstream-git'].filter(Boolean)

const dir = new URL('../targets/', import.meta.url)
const all = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort()
const wanted = (process.env.TARGETS || '').split(/\s+/).filter(Boolean)
const unknown = wanted.filter(t => !all.includes(t))
if (unknown.length)
  throw new Error('unknown targets: ' + unknown.join(', ') + '; known: ' + all.join(', '))

const include = (wanted.length ? wanted : all).flatMap(name => {
  const target = JSON.parse(readFileSync(new URL(name + '.json', dir), 'utf8'))
  const variants = [...(target.variants || [target.unchanged && 'unchanged', 'baseline', 'fork'].filter(Boolean)), ...extra]
  const shards = target.shards ? target.shards.map((_, i) => String(i)) : ['']
  return variants.flatMap(variant => shards.map(shard => ({ target: name, variant, shard, node: target.node, databases: (target.databases || []).join(' '), packages: (target.packages || []).join(' ') })))
})

console.log('version=' + version)
console.log('migrate=' + migrate)
console.log('upstream=' + upstream)
console.log('upstream_sha=' + upstreamSha)
console.log('upstream_sha_version=' + upstreamShaVersion)
console.log('matrix=' + JSON.stringify({ include }))

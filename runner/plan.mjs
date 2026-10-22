import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'

const view = spec => execFileSync('npm', ['view', spec, 'version'], { encoding: 'utf8' }).trim()

const version = view('@steadybrew/postgresjs@' + (process.env.VERSION || 'latest'))
if (!version)
  throw new Error('@steadybrew/postgresjs@' + process.env.VERSION + ' is not on npm')
const migrate = view('@steadybrew/postgresjs-migrate@latest')

const dir = new URL('../targets/', import.meta.url)
const all = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort()
const wanted = (process.env.TARGETS || '').split(/\s+/).filter(Boolean)
const unknown = wanted.filter(t => !all.includes(t))
if (unknown.length)
  throw new Error('unknown targets: ' + unknown.join(', ') + '; known: ' + all.join(', '))

const include = (wanted.length ? wanted : all).flatMap(name => {
  const target = JSON.parse(readFileSync(new URL(name + '.json', dir), 'utf8'))
  const variants = target.variants || [target.unchanged && 'unchanged', 'baseline', 'fork'].filter(Boolean)
  const shards = target.shards ? target.shards.map((_, i) => String(i)) : ['']
  return variants.flatMap(variant => shards.map(shard => ({ target: name, variant, shard, node: target.node, databases: (target.databases || []).join(' '), packages: (target.packages || []).join(' ') })))
})

console.log('version=' + version)
console.log('migrate=' + migrate)
console.log('matrix=' + JSON.stringify({ include }))

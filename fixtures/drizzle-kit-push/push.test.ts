import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { afterAll, beforeAll, expect, test } from 'vitest'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, { onnotice() {} })
const db = drizzle(client, { schema })

const push = () => {
  try {
    return execFileSync(join('node_modules', '.bin', 'drizzle-kit'), ['push', '--force'], { encoding: 'utf8', stdio: 'pipe', timeout: 120_000 })
  } catch (error: any) {
    throw new Error('drizzle-kit push failed: ' + error.stdout + error.stderr)
  }
}

beforeAll(async () => {
  await client.unsafe('drop schema if exists audit cascade; drop schema public cascade; create schema public')
})

afterAll(() => client.end())

test('push creates the tables, enum, view, sequence and second schema', async () => {
  push()
  const tables = await client`select table_schema || '.' || table_name as name from information_schema.tables where table_schema in ('public', 'audit') order by 1`
  expect(tables.map(t => t.name)).toEqual(['audit.events', 'public.posts', 'public.published_posts', 'public.users'])
  const [enumType] = await client`select array_agg(enumlabel::text order by enumsortorder) as labels from pg_enum join pg_type on pg_type.oid = enumtypid where typname = 'mood'`
  expect(enumType.labels).toEqual(['sad', 'ok', 'happy'])
  const [sequence] = await client`select start_value::int from pg_sequences where sequencename = 'ticket_seq'`
  expect(sequence.start_value).toBe(100)
  const constraints = await client`select conname from pg_constraint where conrelid in ('users'::regclass, 'posts'::regclass) and contype in ('c', 'f', 'u') order by 1`
  expect(constraints.map(c => c.conname)).toEqual(['posts_user_id_users_id_fk', 'users_balance_non_negative', 'users_email_unique'])
  const indexes = await client`select indexname from pg_indexes where tablename in ('users', 'posts') and indexname like '%_idx' order by 1`
  expect(indexes.map(i => i.indexname)).toEqual(['posts_user_title_idx', 'users_created_at_idx'])
})

test('a second push finds no changes', () => {
  expect(push()).toContain('No changes detected')
})

test('drizzle-orm reads back what it writes', async () => {
  const [user] = await db.insert(schema.users).values({
    email: 'ada@example.com',
    mood: 'happy',
    profile: { name: 'Ada', tags: ['math'] },
    balance: '12.50',
    tags: ['a', 'b']
  }).returning()
  expect(user.mood).toBe('happy')
  expect(user.profile).toEqual({ name: 'Ada', tags: ['math'] })
  expect(user.balance).toBe('12.50')
  expect(user.tags).toEqual(['a', 'b'])
  expect(user.createdAt).toBeInstanceOf(Date)

  await db.insert(schema.posts).values([
    { userId: user.id, title: 'Hello', published: true },
    { userId: user.id, title: 'Draft' }
  ])
  const published = await db.select().from(schema.publishedPosts)
  expect(published.map(p => p.title)).toEqual(['Hello'])

  await db.insert(schema.events).values({ payload: { kind: 'signup', id: user.id } })
  const [event] = await db.select().from(schema.events)
  expect(event.payload).toEqual({ kind: 'signup', id: user.id })
  expect(event.at).toBeInstanceOf(Date)

  const [next] = await db.execute<{ n: number }>(sql`select nextval('ticket_seq')::int as n`)
  expect(next.n).toBe(100)
})

import { eq, sql } from 'drizzle-orm'
import { boolean, check, index, integer, jsonb, numeric, pgEnum, pgSchema, pgSequence, pgTable, pgView, serial, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

export const mood = pgEnum('mood', ['sad', 'ok', 'happy'])

export const ticket = pgSequence('ticket_seq', { startWith: 100, increment: 1 })

export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  mood: mood('mood').notNull().default('ok'),
  profile: jsonb('profile').$type<{ name: string, tags: string[] }>(),
  balance: numeric('balance', { precision: 12, scale: 2 }).notNull().default('0'),
  tags: text('tags').array().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, t => [
  index('users_created_at_idx').on(t.createdAt),
  check('users_balance_non_negative', sql`${t.balance} >= 0`)
])

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  published: boolean('published').notNull().default(false)
}, t => [uniqueIndex('posts_user_title_idx').on(t.userId, t.title)])

export const publishedPosts = pgView('published_posts').as(qb => qb.select().from(posts).where(eq(posts.published, true)))

export const audit = pgSchema('audit')

export const events = audit.table('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  payload: jsonb('payload').notNull(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow()
})

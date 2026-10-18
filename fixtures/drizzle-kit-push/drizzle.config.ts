import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './schema.ts',
  schemaFilter: ['public', 'audit'],
  dbCredentials: { url: process.env.DATABASE_URL! }
})

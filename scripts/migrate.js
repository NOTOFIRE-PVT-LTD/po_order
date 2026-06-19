#!/usr/bin/env node
// Run: $env:DB_PASSWORD="yourpassword"; node scripts/migrate.js

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const password = process.env.DB_PASSWORD
if (!password) {
  console.error('ERROR: Set DB_PASSWORD environment variable first.')
  console.error('  PowerShell: $env:DB_PASSWORD="yourpassword"; node scripts/migrate.js')
  process.exit(1)
}

const client = new Client({
  host: 'db.bnkeibdfyoamhaojzqky.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  console.log('Connecting to Supabase...')
  await client.connect()
  console.log('Connected.')

  const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql')
  const storagePath = path.join(__dirname, '..', 'supabase', 'storage.sql')

  console.log('Applying schema.sql...')
  const schema = fs.readFileSync(schemaPath, 'utf8')
  await client.query(schema)
  console.log('schema.sql applied.')

  console.log('Applying storage.sql...')
  const storage = fs.readFileSync(storagePath, 'utf8')
  await client.query(storage)
  console.log('storage.sql applied.')

  await client.end()
  console.log('\nDone! Database schema is ready.')
  console.log('Next: create an admin user in Supabase Auth, then run:')
  console.log("  UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';")
}

run().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})

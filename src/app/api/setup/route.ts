import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Client } from 'pg'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (!password) return NextResponse.json({ error: 'password required' }, { status: 400 })

  const client = new Client({
    host: 'db.bnkeibdfyoamhaojzqky.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  })

  try {
    await client.connect()

    const schema = readFileSync(join(process.cwd(), 'supabase', 'schema.sql'), 'utf8')
    const storage = readFileSync(join(process.cwd(), 'supabase', 'storage.sql'), 'utf8')

    await client.query(schema)
    await client.query(storage)
    await client.end()

    return NextResponse.json({ ok: true, message: 'Schema applied successfully!' })
  } catch (err: unknown) {
    try { await client.end() } catch {}
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

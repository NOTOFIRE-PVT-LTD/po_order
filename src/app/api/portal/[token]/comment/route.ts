import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { content, author_name } = await req.json()

  if (!content?.trim() || !author_name?.trim()) {
    return NextResponse.json({ error: 'Content and author name required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc('add_customer_comment', {
    p_token: token,
    p_content: content.trim(),
    p_author_name: author_name.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

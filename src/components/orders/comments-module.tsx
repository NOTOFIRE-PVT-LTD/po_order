'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { formatDateTime, getInitials } from '@/lib/utils'
import { Send, Trash2 } from 'lucide-react'
import type { Comment } from '@/types'

interface Props {
  order: Record<string, unknown>
  profile: Record<string, unknown> | null
  initialData: Comment[]
}

export default function CommentsModule({ order, profile, initialData }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialData)
  const [content, setContent] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isAdmin = (profile as { role: string })?.role === 'admin'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/purchase-orders/${order.id as string}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), is_internal: isInternal }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setComments(prev => [...prev, data.data])
      setContent('')
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('Delete this comment?')) return
    setDeleting(commentId)
    try {
      const res = await fetch(`/api/purchase-orders/${order.id as string}/comments?commentId=${commentId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error)
      }
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed', variant: 'error' })
    } finally {
      setDeleting(null)
    }
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-600',
    staff: 'bg-blue-600',
    customer: 'bg-green-600',
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Discussion ({comments.filter(c => !c.is_internal).length})</h2>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
          {comments.length === 0 && (
            <p className="text-center text-gray-500 py-8">No messages yet. Start the conversation!</p>
          )}
          {comments.map(comment => {
            const isMe = comment.author_id === (profile as { id: string })?.id
            const initials = getInitials(comment.author_name)
            const color = roleColors[comment.author_role] ?? 'bg-gray-600'

            return (
              <div key={comment.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group`}>
                <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-1`}>
                  {initials}
                </div>
                <div className={`flex-1 max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-medium text-gray-300">{comment.author_name}</span>
                    <span className="text-xs text-gray-600 capitalize">{comment.author_role}</span>
                    {comment.is_internal && <span className="text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-800 px-1.5 py-0.5 rounded">Internal</span>}
                  </div>
                  <div className={`relative rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-800 text-gray-200 rounded-tl-sm'} ${comment.is_internal ? 'border border-yellow-700/50' : ''}`}>
                    {comment.content}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 rounded-full p-0.5 hover:bg-red-700"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">{formatDateTime(comment.created_at)}</span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-800 p-4">
          <form onSubmit={handleSend} className="space-y-3">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Type a message..."
              rows={2}
              className="flex w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-xs text-gray-400">Internal note (hidden from customer)</span>
              </label>
              <Button type="submit" size="sm" loading={loading} disabled={!content.trim()}>
                <Send className="w-3.5 h-3.5" />
                Send
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

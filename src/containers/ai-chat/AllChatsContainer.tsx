'use client'

import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search as SearchIcon,
  MessageSquare,
  Clock,
  Trash2,
  AlertCircle,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useChatSessions, useDeleteChatSession } from '@/containers/ai-chat/lib'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatRelativeTime } from '@/lib/date-utils'

export function AllChatsContainer() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null)

  // TanStack Query hooks
  const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active'
  const { data: sessions = [], isLoading, error } = useChatSessions(0, 100, isActive, searchQuery)
  const deleteMutation = useDeleteChatSession()

  // Filter and sort sessions
  const filteredSessions = useMemo(() => {
    let filtered = sessions

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      filtered = filtered.filter((session) => session.title.toLowerCase().includes(q))
    }

    // Sort by last activity (most recent first)
    return [...filtered].sort(
      (a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
    )
  }, [sessions, searchQuery])

  const handleSessionClick = (sessionId: string) => {
    router.push(`/ai-chat?session=${sessionId}`)
  }

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setDeleteSessionId(sessionId)
  }

  const handleConfirmDelete = async () => {
    if (deleteSessionId) {
      await deleteMutation.mutateAsync(deleteSessionId)
      setDeleteSessionId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Chats</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          View and manage all your AI chat sessions
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chat sessions..."
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pr-3 pl-10 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
        >
          <SelectTrigger className="w-[180px] rounded-lg border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900">
            <Filter className="mr-2 size-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-3 size-12 text-red-500" />
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {error instanceof Error ? error.message : 'Failed to load chat sessions'}
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
              Loading chat sessions...
            </span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="mb-3 size-12 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No chat sessions found matching your search' : 'No chat sessions yet'}
            </p>
            <Button
              onClick={() => router.push('/ai-chat')}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Start New Chat
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session.id)}
                className="group flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
              >
                <div className="flex flex-1 items-start gap-4">
                  <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/20">
                    <MessageSquare className="size-5 text-purple-600 dark:text-purple-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {session.title || 'Untitled Chat'}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3" />
                        {session.message_count}{' '}
                        {session.message_count === 1 ? 'message' : 'messages'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {formatRelativeTime(session.last_activity)}
                      </span>
                      {session.is_active && (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteClick(e, session.id)}
                  className="opacity-0 transition group-hover:opacity-100"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteSessionId}
        title="Delete Chat Session?"
        description="This action cannot be undone. This will permanently delete the chat session and all its messages."
        confirmLabel="Delete"
        confirmVariant="destructive"
        isConfirming={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteSessionId(null)}
        onOpenChange={(open) => !open && setDeleteSessionId(null)}
      />
    </div>
  )
}

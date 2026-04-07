import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, Clock, Trash2, MoreVertical, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/date-utils'
import type { ChatListItemProps } from '@/containers/ai-chat/lib/types'
import { MENU_ITEM_HEIGHT, MENU_PADDING, MENU_WIDTH } from '@/containers/ai-chat/lib/constants'

export function ChatListItem({
  id,
  title,
  messageCount,
  lastActivity,
  isActive,
  isSelected,
  onClick,
  onDelete,
  onRename,
}: ChatListItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)

  const handleRename = useCallback(() => {
    setIsEditing(false)
    setIsMenuOpen(false)
    if (editedTitle.trim() && editedTitle !== title && onRename) {
      onRename(id, editedTitle.trim())
    } else {
      setEditedTitle(title)
    }
  }, [editedTitle, title, id, onRename])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleRename()
      } else if (e.key === 'Escape') {
        setEditedTitle(title)
        setIsEditing(false)
      }
    },
    [handleRename, title]
  )

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value)
  }, [])

  const handleInputClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMenuOpen((prev) => !prev)
  }, [])

  const closeMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsMenuOpen(false)
  }, [])

  const handleRenameClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setIsMenuOpen(false)
  }, [])

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (onDelete) {
        onDelete(id)
      }
      setIsMenuOpen(false)
    },
    [id, onDelete]
  )

  // Position menu in viewport when open so it isn't clipped by overflow
  useEffect(() => {
    if (!isMenuOpen || !menuButtonRef.current) {
      setMenuPosition(null)
      return
    }
    const rect = menuButtonRef.current.getBoundingClientRect()
    const itemCount = [onRename, onDelete].filter(Boolean).length
    const menuHeight = itemCount * MENU_ITEM_HEIGHT + MENU_PADDING * 2
    const spaceBelow = window.innerHeight - rect.bottom
    const openAbove = spaceBelow < menuHeight && rect.top >= menuHeight
    setMenuPosition({
      top: openAbove ? rect.top - menuHeight : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
    })
  }, [isMenuOpen, onRename, onDelete])

  const menuContent = isMenuOpen && menuPosition && typeof document !== 'undefined' && (
    <>
      <div className="fixed inset-0 z-40" aria-hidden onClick={closeMenu} />
      <div
        className="bg-card border-border fixed z-50 min-w-[160px] rounded-lg border shadow-lg"
        style={{ top: menuPosition.top, left: menuPosition.left }}
        role="menu"
      >
        <div className="py-1">
          {onRename && (
            <button
              onClick={handleRenameClick}
              className="hover:bg-muted flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300"
              role="menuitem"
            >
              <Edit className="size-4" />
              Rename
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="hover:bg-muted flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 dark:text-red-400"
              role="menuitem"
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  )

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:border-purple-300 hover:shadow-sm dark:hover:border-purple-700',
        isSelected
          ? 'border-purple-500 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/20'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      )}
    >
      <div
        onClick={onClick}
        className={cn(
          'flex size-9 flex-shrink-0 items-center justify-center rounded-lg',
          isSelected
            ? 'bg-purple-600 text-white'
            : 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
        )}
      >
        <MessageSquare className="size-4" />
      </div>

      <div onClick={onClick} className="min-w-0 flex-1">
        {isEditing ? (
          <input
            type="text"
            value={editedTitle}
            onChange={handleTitleChange}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full rounded border border-purple-500 bg-white px-2 py-0.5 text-sm font-medium text-gray-900 outline-none dark:bg-gray-800 dark:text-gray-100"
            onClick={handleInputClick}
          />
        ) : (
          <h3
            className={cn(
              'truncate text-sm font-medium',
              isSelected
                ? 'text-purple-900 dark:text-purple-100'
                : 'text-gray-900 dark:text-gray-100'
            )}
          >
            {title || 'Untitled Chat'}
          </h3>
        )}
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            {messageCount}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatRelativeTime(lastActivity)}
          </span>
          {isActive && (
            <span className="ml-auto inline-flex size-2 rounded-full bg-green-500"></span>
          )}
        </div>
      </div>

      {/* Three-dot menu button */}
      <div className="relative flex-shrink-0">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={toggleMenu}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          title="More options"
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
        >
          <MoreVertical className="size-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
        </button>
        {/* Dropdown menu rendered in portal so it isn't clipped by overflow */}
        {isMenuOpen &&
          typeof document !== 'undefined' &&
          menuContent &&
          createPortal(menuContent, document.body)}
      </div>
    </div>
  )
}

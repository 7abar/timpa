/**
 * ChatInput — message input with send button
 * Disabled when stream is paused
 */
'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Send, PauseCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => Promise<void>
  isStreamActive: boolean
  isLoading?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  isStreamActive,
  isLoading = false,
  placeholder = 'Ask your agent anything...',
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = isStreamActive && value.trim().length > 0 && !isSending && !isLoading

  const handleSend = async () => {
    const msg = value.trim()
    if (!msg || !canSend) return

    setValue('')
    setIsSending(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      await onSend(msg)
    } finally {
      setIsSending(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  return (
    <div className="border-t border-border bg-background/80 backdrop-blur-sm p-4">
      {!isStreamActive && (
        <div className="flex items-center gap-2 mb-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-400">
          <PauseCircle className="h-4 w-4 shrink-0" />
          <span>Stream paused — resume to send messages</span>
        </div>
      )}

      <div className={cn(
        'flex items-end gap-3 rounded-xl border bg-card p-3 transition-colors',
        isStreamActive
          ? 'border-border focus-within:border-timpa-gold/50'
          : 'border-border/50 opacity-60'
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={!isStreamActive || isSending}
          placeholder={isStreamActive ? placeholder : 'Resume stream to chat...'}
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground',
            'disabled:cursor-not-allowed max-h-[200px] overflow-y-auto'
          )}
        />

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'h-8 w-8 shrink-0 transition-all',
            canSend
              ? 'bg-timpa-gold text-black hover:bg-timpa-gold/90'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isSending ? (
            <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="mt-2 text-center text-[10px] text-muted-foreground">
        Press Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}

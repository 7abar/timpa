/**
 * MessageBubble — renders a single chat message
 * Agent messages on left, user messages on right
 */
import { Bot } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

interface MessageBubbleProps {
  message: Message
  currentUserId?: string
  agentName?: string
  agentAvatar?: string
}

export function MessageBubble({
  message,
  currentUserId,
  agentName = 'Agent',
  agentAvatar,
}: MessageBubbleProps) {
  const isOwn = !message.is_agent && message.sender_id === currentUserId
  const isAgent = message.is_agent

  if (isAgent) {
    return (
      <div className="flex items-start gap-3 max-w-[85%]">
        {/* Agent Avatar */}
        <Avatar className="h-8 w-8 border border-timpa-gold/30 shrink-0 mt-0.5">
          <AvatarImage src={agentAvatar} />
          <AvatarFallback className="bg-timpa-gold/20 text-timpa-gold">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-timpa-gold">{agentName}</span>
            <span className="text-[10px] text-muted-foreground">
              {formatDate(message.created_at)}
            </span>
            <span className="text-[10px] bg-timpa-gold/20 text-timpa-gold px-1.5 py-0.5 rounded-full">
              AI
            </span>
          </div>
          <div className="rounded-2xl rounded-tl-sm bg-card border border-border/60 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </div>
    )
  }

  // User message — right-aligned
  return (
    <div className={cn('flex items-start gap-3 max-w-[85%]', isOwn && 'ml-auto flex-row-reverse')}>
      <Avatar className="h-8 w-8 border border-border shrink-0 mt-0.5">
        <AvatarImage src={message.sender?.avatar_url ?? undefined} />
        <AvatarFallback className="text-xs bg-muted">
          {message.sender?.username?.[0]?.toUpperCase() ?? 'U'}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col gap-1', isOwn && 'items-end')}>
        <div className={cn('flex items-center gap-2', isOwn && 'flex-row-reverse')}>
          <span className="text-xs font-medium text-muted-foreground">
            {isOwn ? 'You' : (message.sender?.username ?? 'User')}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatDate(message.created_at)}
          </span>
        </div>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isOwn
            ? 'bg-timpa-gold text-black rounded-tr-sm'
            : 'bg-muted border border-border/60 rounded-tl-sm'
        )}>
          {message.content}
        </div>
      </div>
    </div>
  )
}

/**
 * TypingIndicator — animated dots for "agent is thinking"
 */
export function TypingIndicator({ agentName = 'Agent' }: { agentName?: string }) {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      <Avatar className="h-8 w-8 border border-timpa-gold/30 shrink-0">
        <AvatarFallback className="bg-timpa-gold/20 text-timpa-gold">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-timpa-gold">{agentName}</span>
        <div className="rounded-2xl rounded-tl-sm bg-card border border-border/60 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-timpa-gold animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-timpa-gold animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-timpa-gold animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  )
}

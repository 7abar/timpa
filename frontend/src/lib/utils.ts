import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format ETH value to a human-readable string
 * e.g. 0.001234 → "0.0012 ETH"
 */
export function formatEth(value: number, decimals = 4): string {
  if (value === 0) return '0 ETH'
  if (value < 0.0001) return '< 0.0001 ETH'
  return `${value.toFixed(decimals)} ETH`
}

/**
 * Format ETH to USD estimate
 * Uses a simple multiplier — replace with a live price feed in production
 */
export function formatEthUsd(ethValue: number, ethPriceUsd = 3000): string {
  const usd = ethValue * ethPriceUsd
  if (usd < 0.01) return '< $0.01'
  return `$${usd.toFixed(2)}`
}

/**
 * Shorten an Ethereum address: 0x1234...5678
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Format a date string to relative time or absolute
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDay > 365 ? 'numeric' : undefined,
  })
}

/**
 * Format seconds duration → HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Convert a channel name to a URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')     // remove non-word chars
    .replace(/[\s_-]+/g, '-')     // replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '')      // trim leading/trailing hyphens
}

/**
 * Truncate text to a max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Format a number with K/M suffix
 */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/**
 * Estimate token count from text (rough approximation)
 * 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

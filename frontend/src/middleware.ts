/**
 * Next.js Middleware
 * Protects authenticated routes and refreshes Supabase sessions
 */
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/channel',   // /channel/[slug]/room
  '/create',
  '/profile',
]

// Paths that start with these prefixes require auth check
function requiresAuth(pathname: string): boolean {
  // Protect /channel/[slug]/room but NOT /channel/[slug] (public detail page)
  if (pathname.match(/^\/channel\/[^/]+\/room/)) return true
  if (pathname.startsWith('/create')) return true
  if (pathname.startsWith('/profile')) return true
  return false
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Redirect unauthenticated users from protected routes
  if (requiresAuth(pathname) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/signup'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

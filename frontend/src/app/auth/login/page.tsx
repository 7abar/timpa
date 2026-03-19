/**
 * Login Page
 */
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { signIn } from '@/app/actions/auth'
import { toast } from '@/components/ui/toast'

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)

    startTransition(async () => {
      const result = await signIn(formData)
      if (result?.error) {
        toast.error('Sign in failed', result.error)
      }
    })
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-timpa-gold mb-3">
            <Zap className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-center">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to Timpa</p>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isPending}
                disabled={isPending}
              >
                Sign In
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground uppercase">
                <span className="bg-card px-2">or</span>
              </div>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="text-timpa-gold hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

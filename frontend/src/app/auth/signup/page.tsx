/**
 * Signup Page
 */
'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { signUp } from '@/app/actions/auth'
import { toast } from '@/components/ui/toast'

export default function SignupPage() {
  const [isPending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)
    formData.set('username', username)
    formData.set('referralCode', referralCode)

    startTransition(async () => {
      const result = await signUp(formData)
      if (result?.error) {
        toast.error('Sign up failed', result.error)
      } else {
        setDone(true)
      }
    })
  }

  if (done) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h2 className="text-xl font-bold mb-2">Check your email</h2>
          <p className="text-muted-foreground text-sm">
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
          <Link href="/auth/login" className="mt-6 block text-sm text-timpa-gold hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-timpa-gold mb-3">
            <Zap className="h-6 w-6 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-center">Create your account</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Join the AI Agent economy
          </p>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="cryptosage"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required
                  autoComplete="username"
                  minLength={3}
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">3-20 chars, lowercase letters, numbers, underscores</p>
              </div>

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
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral">Referral Code (optional)</Label>
                <Input
                  id="referral"
                  type="text"
                  placeholder="Enter code if you have one"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isPending}
                disabled={isPending}
              >
                Create Account
              </Button>
            </form>

            <p className="text-sm text-center text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-timpa-gold hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

'use client'

/**
 * CreateChannelForm — full client-side form for launching an AI agent channel.
 *
 * Features:
 *  - Personality template picker (1-click fills name + system prompt + agent config)
 *  - Provider dropdown → auto-populates model options
 *  - API key (password input) + "Test Key" button (calls /api/test-api-key)
 *  - System prompt textarea with live character count
 *  - Streaming rate slider (0.001 – 0.1 ETH/min) with estimated earnings
 *  - Agent config panel: temperature, max tokens, no-emoji toggle
 *  - Submits via createChannel Server Action
 */

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label }    from '@/components/ui/label'
import { Badge }    from '@/components/ui/badge'
import { Switch }   from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { PersonalityTemplates, PERSONALITY_TEMPLATES } from './personality-templates'
import { createChannel } from '@/app/actions/channel'
import { LLMProvider, PROVIDER_MODELS, DEFAULT_AGENT_CONFIG } from '@/types'
import type { PersonalityTemplate, AgentConfig } from '@/types'
import { cn } from '@/lib/utils'

import {
  Eye, EyeOff, CheckCircle2, XCircle, Loader2,
  ChevronDown, ChevronUp, Zap, Settings2,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

function estimateMonthlyEarnings(rateEth: number): string {
  // Assume 100 subscribers × avg 30 min/day × 30 days
  const eth = rateEth * 30 * 30 * 100
  return eth.toFixed(2)
}

const ETH_PRICE_USD = 3200 // rough estimate for display only

// ── Types ─────────────────────────────────────────────────────────────────────

type TestKeyStatus = 'idle' | 'loading' | 'valid' | 'invalid'

interface Props {
  userId: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreateChannelForm({ userId }: Props) {
  const router  = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Form state ──────────────────────────────────────────────────────────
  const [name,              setName]              = useState('')
  const [slug,              setSlug]              = useState('')
  const [bio,               setBio]               = useState('')
  const [provider,          setProvider]          = useState<LLMProvider>(LLMProvider.Anthropic)
  const [model,             setModel]             = useState(PROVIDER_MODELS[LLMProvider.Anthropic][0])
  const [apiKey,            setApiKey]            = useState('')
  const [showKey,           setShowKey]           = useState(false)
  const [systemPrompt,      setSystemPrompt]      = useState('')
  const [selectedTemplate,  setSelectedTemplate]  = useState<string | null>(null)
  const [rateEthPerMin,     setRateEthPerMin]     = useState(0.005)
  const [agentConfig,       setAgentConfig]       = useState<AgentConfig>(DEFAULT_AGENT_CONFIG)
  const [showAdvanced,      setShowAdvanced]      = useState(false)

  // ── API key test ────────────────────────────────────────────────────────
  const [testStatus,  setTestStatus]  = useState<TestKeyStatus>('idle')
  const [testMessage, setTestMessage] = useState('')

  const handleTestKey = useCallback(async () => {
    if (!apiKey || !model) return
    setTestStatus('loading')
    setTestMessage('')

    try {
      const res = await fetch('/api/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model }),
      })
      const data = await res.json() as { valid: boolean; error?: string }

      if (data.valid) {
        setTestStatus('valid')
        setTestMessage('API key is valid.')
        toast.success('API key verified successfully')
      } else {
        setTestStatus('invalid')
        setTestMessage(data.error ?? 'Key rejected by provider.')
        toast.error('Invalid API key')
      }
    } catch {
      setTestStatus('invalid')
      setTestMessage('Could not reach test endpoint.')
    }
  }, [apiKey, model, provider])

  // ── Template picker ─────────────────────────────────────────────────────
  const handleTemplateSelect = useCallback((template: PersonalityTemplate) => {
    setSelectedTemplate(template.id)
    setName(template.name)
    setSlug(slugify(template.name))
    setSystemPrompt(template.systemPrompt)
    setProvider(template.suggestedProvider)
    setModel(template.suggestedModel)
    if (template.agentConfig) {
      setAgentConfig({ ...DEFAULT_AGENT_CONFIG, ...template.agentConfig })
    }
    toast.success(`Loaded "${template.label}" template`)
  }, [])

  // ── Provider change ─────────────────────────────────────────────────────
  const handleProviderChange = useCallback((val: string) => {
    const p = val as LLMProvider
    setProvider(p)
    setModel(PROVIDER_MODELS[p][0])
    setTestStatus('idle')
    setTestMessage('')
  }, [])

  // ── Name → slug ─────────────────────────────────────────────────────────
  const handleNameChange = useCallback((val: string) => {
    setName(val)
    setSlug(slugify(val))
  }, [])

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (testStatus === 'invalid') {
      toast.error('Fix your API key before launching')
      return
    }
    if (systemPrompt.length < 20) {
      toast.error('System prompt must be at least 20 characters')
      return
    }

    const form = e.currentTarget
    startTransition(async () => {
      const fd = new FormData(form)
      // Manually append computed/state values not in native inputs
      fd.set('agentConfig', JSON.stringify(agentConfig))
      fd.set('personalityTemplate', selectedTemplate ?? '')

      const result = await createChannel(fd)
      if (result?.error) {
        toast.error(result.error)
      }
      // On success, createChannel redirects — no need to handle here
    })
  }, [testStatus, systemPrompt, agentConfig, selectedTemplate])

  const systemPromptLength = systemPrompt.length
  const estimatedEarnings  = estimateMonthlyEarnings(rateEthPerMin)

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Step 1: Pick a personality ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            Choose a Persona
          </CardTitle>
          <CardDescription>
            Pick a template to auto-fill your agent. You can edit everything after.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PersonalityTemplates
            selected={selectedTemplate}
            onSelect={handleTemplateSelect}
          />
        </CardContent>
      </Card>

      {/* ── Step 2: Channel identity ────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            Channel Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Channel name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="e.g. Lunethra Alpha"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={60}
            />
          </div>

          {/* Slug (read-only) */}
          <div className="space-y-1.5">
            <Label htmlFor="slug">URL slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">timpa.xyz/channel/</span>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="lunethra-alpha"
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="bio">Short bio <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="bio"
              name="bio"
              placeholder="What subscribers get in this channel"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Step 3: LLM Provider + API Key ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
            LLM Provider &amp; API Key
          </CardTitle>
          <CardDescription>
            Your key powers the agent. It is encrypted with pgcrypto before storage and never exposed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Provider */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Provider <span className="text-destructive">*</span></Label>
              <Select
                name="provider"
                value={provider}
                onValueChange={handleProviderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(LLMProvider).map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <Label>Model <span className="text-destructive">*</span></Label>
              <Select
                name="model"
                value={model}
                onValueChange={setModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_MODELS[provider].map((m) => (
                    <SelectItem key={m} value={m}>
                      <span className="font-mono text-xs">{m}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <Label htmlFor="apiKey">API Key <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apiKey"
                  name="apiKey"
                  type={showKey ? 'text' : 'password'}
                  required
                  placeholder={`sk-... or ${provider} API key`}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setTestStatus('idle')
                  }}
                  className={cn(
                    'pr-10 font-mono text-sm',
                    testStatus === 'valid'   && 'border-green-500 focus-visible:ring-green-500',
                    testStatus === 'invalid' && 'border-destructive focus-visible:ring-destructive',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Test button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!apiKey || testStatus === 'loading'}
                onClick={handleTestKey}
                className="shrink-0"
              >
                {testStatus === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : testStatus === 'valid' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : testStatus === 'invalid' ? (
                  <XCircle className="h-4 w-4 text-destructive" />
                ) : null}
                <span className="ml-1.5">
                  {testStatus === 'loading' ? 'Testing...' :
                   testStatus === 'valid'   ? 'Valid' :
                   testStatus === 'invalid' ? 'Invalid' : 'Test Key'}
                </span>
              </Button>
            </div>

            {/* Test result message */}
            {testMessage && (
              <p className={cn(
                'text-xs mt-1',
                testStatus === 'valid'   ? 'text-green-400' : 'text-destructive',
              )}>
                {testMessage}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Encrypted with pgcrypto before storage. Never logged or exposed.
            </p>
          </div>

        </CardContent>
      </Card>

      {/* ── Step 4: System Prompt ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
            System Prompt
          </CardTitle>
          <CardDescription>
            Defines your agent character. Be specific — vague prompts produce generic agents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            id="systemPrompt"
            name="systemPrompt"
            required
            rows={10}
            placeholder="You are [name]... Define personality, rules, tone, and what subscribers should expect in every message."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="font-mono text-sm resize-y"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {systemPromptLength < 20 && systemPromptLength > 0
                ? <span className="text-destructive">Minimum 20 characters</span>
                : `${systemPromptLength} characters`
              }
            </span>
            <span className={cn(
              systemPromptLength > 2000 ? 'text-yellow-400' :
              systemPromptLength > 3000 ? 'text-destructive' : ''
            )}>
              {systemPromptLength}/3000
            </span>
          </div>
          {/* Character count bar */}
          <Progress
            value={Math.min((systemPromptLength / 3000) * 100, 100)}
            className="h-1"
          />
        </CardContent>
      </Card>

      {/* ── Step 5: Streaming Rate ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">5</span>
            Streaming Rate
          </CardTitle>
          <CardDescription>
            Subscribers pay this rate per minute via Tempo MPP while their stream is active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rateEthPerMin">Rate (ETH/min)</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-primary">
                  {rateEthPerMin.toFixed(4)} ETH/min
                </Badge>
                <Badge variant="secondary" className="font-mono text-xs">
                  ~${(rateEthPerMin * ETH_PRICE_USD).toFixed(2)}/min
                </Badge>
              </div>
            </div>

            {/* Rate slider */}
            <input
              type="range"
              id="rateRange"
              min={0.0001}
              max={0.1}
              step={0.0001}
              value={rateEthPerMin}
              onChange={(e) => setRateEthPerMin(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
            {/* Hidden actual input for form submission */}
            <input
              type="hidden"
              name="rateEthPerMin"
              value={rateEthPerMin}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.0001 ETH/min</span>
              <span>0.1 ETH/min</span>
            </div>
          </div>

          {/* Estimated earnings */}
          <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Estimated monthly earnings
            </p>
            <p className="text-sm">
              <span className="text-lg font-bold text-primary">{estimatedEarnings} ETH</span>
              <span className="text-muted-foreground ml-2 text-xs">
                (~${(parseFloat(estimatedEarnings) * ETH_PRICE_USD).toLocaleString()})
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              Based on 100 subscribers × 30 min/day × 30 days. Actual results vary.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Step 6: Advanced Agent Config (collapsible) ──────────────────── */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setShowAdvanced((s) => !s)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              Advanced Agent Config
              <Badge variant="secondary" className="text-[10px]">optional</Badge>
            </CardTitle>
            {showAdvanced
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />
            }
          </div>
          {!showAdvanced && (
            <CardDescription>
              Temperature: {agentConfig.temperature} · Max tokens: {agentConfig.maxTokens} · No emoji: {agentConfig.noEmoji ? 'on' : 'off'}
            </CardDescription>
          )}
        </CardHeader>

        {showAdvanced && (
          <CardContent className="space-y-5">

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Temperature</Label>
                <Badge variant="outline" className="font-mono">
                  {agentConfig.temperature.toFixed(2)}
                </Badge>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.01}
                value={agentConfig.temperature}
                onChange={(e) => setAgentConfig((c) => ({ ...c, temperature: parseFloat(e.target.value) }))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.0 — precise, deterministic</span>
                <span>1.0 — creative, chaotic</span>
              </div>
            </div>

            {/* Max tokens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Max tokens per response</Label>
                <Badge variant="outline" className="font-mono">{agentConfig.maxTokens}</Badge>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={agentConfig.maxTokens}
                onChange={(e) => setAgentConfig((c) => ({ ...c, maxTokens: parseInt(e.target.value) }))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>50 — ultra concise</span>
                <span>500 — detailed</span>
              </div>
            </div>

            {/* Proactive interval */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Min interval (s)</Label>
                <Input
                  type="number"
                  min={3}
                  max={30}
                  value={agentConfig.proactiveIntervalMin}
                  onChange={(e) => setAgentConfig((c) => ({
                    ...c,
                    proactiveIntervalMin: Math.max(3, parseInt(e.target.value) || 5),
                  }))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Max interval (s)</Label>
                <Input
                  type="number"
                  min={5}
                  max={60}
                  value={agentConfig.proactiveIntervalMax}
                  onChange={(e) => setAgentConfig((c) => ({
                    ...c,
                    proactiveIntervalMax: Math.max(
                      c.proactiveIntervalMin + 1,
                      parseInt(e.target.value) || 10,
                    ),
                  }))}
                  className="font-mono"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground -mt-2">
              Agent posts one message every {agentConfig.proactiveIntervalMin}–{agentConfig.proactiveIntervalMax}s while stream is active.
            </p>

            {/* No emoji */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Disable emojis</p>
                <p className="text-xs text-muted-foreground">
                  Agent outputs text only — no emoji in any message.
                </p>
              </div>
              <Switch
                checked={agentConfig.noEmoji}
                onCheckedChange={(v) => setAgentConfig((c) => ({ ...c, noEmoji: v }))}
              />
            </div>

          </CardContent>
        )}
      </Card>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground max-w-xs">
          By launching, you agree that your agent runs 24/7 for paying subscribers.
          You can pause or edit it any time from your profile.
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={isPending || !name || !apiKey || !systemPrompt || systemPrompt.length < 20}
          className="min-w-[160px] bg-primary text-primary-foreground font-semibold glow-gold"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Launching...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Launch Channel
            </>
          )}
        </Button>
      </div>

    </form>
  )
}

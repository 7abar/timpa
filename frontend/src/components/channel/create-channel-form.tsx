/**
 * CreateChannelForm — full form for creating a new AI agent channel
 */
'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PersonalityTemplates } from './personality-templates'
import type { PersonalityTemplate } from '@/types'
import { LLMProvider, PROVIDER_MODELS } from '@/types'
import { slugify } from '@/lib/utils'
import { createChannel } from '@/app/actions/channel'
import { toast } from '@/components/ui/toast'

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  [LLMProvider.Anthropic]: 'Anthropic (Claude)',
  [LLMProvider.OpenAI]:    'OpenAI (GPT)',
  [LLMProvider.Groq]:      'Groq (Fast LLM)',
  [LLMProvider.Gemini]:    'Google Gemini',
  [LLMProvider.Together]:  'Together AI',
}

type ApiKeyState = 'idle' | 'testing' | 'valid' | 'invalid'

export function CreateChannelForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [bio, setBio] = useState('')
  const [provider, setProvider] = useState<LLMProvider>(LLMProvider.Anthropic)
  const [model, setModel] = useState<string>(PROVIDER_MODELS[LLMProvider.Anthropic][0])
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [personalityTemplate, setPersonalityTemplate] = useState<string | null>(null)
  const [rateEthPerMin, setRateEthPerMin] = useState(0.005)
  const [apiKeyState, setApiKeyState] = useState<ApiKeyState>('idle')
  const [apiKeyError, setApiKeyError] = useState('')

  // Auto-generate slug from name
  useEffect(() => {
    if (name) setSlug(slugify(name))
  }, [name])

  // Reset model when provider changes
  useEffect(() => {
    setModel(PROVIDER_MODELS[provider][0])
  }, [provider])

  const handleTemplateSelect = (template: PersonalityTemplate) => {
    setPersonalityTemplate(template.id)
    setName(template.name)
    setSystemPrompt(template.systemPrompt)
    setProvider(template.suggestedProvider)
    setModel(template.suggestedModel)
  }

  const testApiKey = async () => {
    if (!apiKey.trim()) return
    setApiKeyState('testing')
    setApiKeyError('')
    try {
      const res = await fetch('/api/test-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model }),
      })
      const data = await res.json()
      if (data.valid) {
        setApiKeyState('valid')
        toast.success('API key is valid!')
      } else {
        setApiKeyState('invalid')
        setApiKeyError(data.error ?? 'Invalid API key')
        toast.error('API key is invalid', data.error)
      }
    } catch {
      setApiKeyState('invalid')
      setApiKeyError('Failed to test API key')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug || !provider || !model || !apiKey || !systemPrompt) {
      toast.error('Please fill in all required fields')
      return
    }

    const formData = new FormData()
    formData.set('name', name)
    formData.set('slug', slug)
    formData.set('bio', bio)
    formData.set('provider', provider)
    formData.set('model', model)
    formData.set('apiKey', apiKey)
    formData.set('systemPrompt', systemPrompt)
    formData.set('personalityTemplate', personalityTemplate ?? '')
    formData.set('rateEthPerMin', String(rateEthPerMin))

    startTransition(async () => {
      const result = await createChannel(formData)
      if (result?.error) {
        toast.error('Failed to create channel', result.error)
      } else {
        toast.success('Channel created!', 'Your AI agent is live.')
        router.push(`/channel/${slug}`)
      }
    })
  }

  const charCount = systemPrompt.length
  const maxChars = 2000

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Personality Templates */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Choose a Personality</Label>
        <PersonalityTemplates
          selected={personalityTemplate}
          onSelect={handleTemplateSelect}
        />
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Channel Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder="e.g. CryptoSage"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">
            URL Slug <span className="text-destructive">*</span>
          </Label>
          <Input
            id="slug"
            placeholder="crypto-sage"
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            required
          />
          <p className="text-xs text-muted-foreground">
            timpa.io/channel/{slug || 'your-slug'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          placeholder="Describe what your agent does..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="h-20"
        />
      </div>

      {/* Model Config */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>
            Provider <span className="text-destructive">*</span>
          </Label>
          <Select
            value={provider}
            onValueChange={(v) => setProvider(v as LLMProvider)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(LLMProvider).map((p) => (
                <SelectItem key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>
            Model <span className="text-destructive">*</span>
          </Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_MODELS[provider].map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <Label htmlFor="apiKey">
          API Key <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="apiKey"
              type={showApiKey ? 'text' : 'password'}
              placeholder={`Enter your ${PROVIDER_LABELS[provider]} API key`}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setApiKeyState('idle')
              }}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={testApiKey}
            disabled={!apiKey || apiKeyState === 'testing'}
            className="shrink-0"
          >
            {apiKeyState === 'testing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : apiKeyState === 'valid' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : apiKeyState === 'invalid' ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              'Test Key'
            )}
          </Button>
        </div>
        {apiKeyError && (
          <p className="text-xs text-destructive">{apiKeyError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          🔒 Your API key is encrypted before storage. Never shared with users.
        </p>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="systemPrompt">
            System Prompt <span className="text-destructive">*</span>
          </Label>
          <span className={`text-xs ${charCount > maxChars ? 'text-destructive' : 'text-muted-foreground'}`}>
            {charCount}/{maxChars}
          </span>
        </div>
        <Textarea
          id="systemPrompt"
          placeholder="Define your agent's personality, expertise, and behavior..."
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="h-48 font-mono text-xs"
          required
        />
      </div>

      {/* Rate Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Streaming Rate</Label>
          <span className="text-sm font-semibold text-timpa-gold">
            {rateEthPerMin.toFixed(4)} ETH/min
          </span>
        </div>
        <input
          type="range"
          min={0.001}
          max={0.1}
          step={0.001}
          value={rateEthPerMin}
          onChange={(e) => setRateEthPerMin(parseFloat(e.target.value))}
          className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-timpa-gold"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.001 ETH/min (cheapest)</span>
          <span>0.1 ETH/min (premium)</span>
        </div>
        <p className="text-xs text-muted-foreground">
          ≈ ${(rateEthPerMin * 3000 * 60).toFixed(2)} USD/hour at current ETH price
        </p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending || charCount > maxChars}
        loading={isPending}
      >
        {isPending ? 'Creating Channel...' : '🚀 Launch Your AI Agent'}
      </Button>
    </form>
  )
}

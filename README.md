# Timpa — AI Agent Channels · SocialFi

> **Live AI Agents. Pay for the conversation.**

Timpa is a SocialFi platform where anyone can create, own, and monetize AI Agent channels. Users subscribe via streaming micropayments (Tempo MPP) and get real-time conversations with persistent AI personalities.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND                              │
│                  Next.js 15 App Router                      │
│            (Server Actions + RSC + Client)                  │
│                                                             │
│   ┌─────────┐  ┌──────────────┐  ┌────────────────────┐    │
│   │ Supabase│  │  Tempo MPP   │  │  Server Actions     │    │
│   │  Client │  │  (wagmi/viem)│  │  (channel/auth/msg) │    │
│   └────┬────┘  └──────┬───────┘  └────────┬───────────┘    │
│        │              │                    │                │
└────────┼──────────────┼────────────────────┼────────────────┘
         │              │                    │
         ▼              ▼                    ▼
┌─────────────┐  ┌────────────┐   ┌────────────────────┐
│  Supabase   │  │ On-chain   │   │   Agent Runner     │
│  (Auth, DB, │  │ Payments   │   │   (FastAPI +        │
│   Realtime) │  │ (Tempo MPP)│   │    LiteLLM)        │
└─────────────┘  └────────────┘   └────────────────────┘
                                           │
                                           ▼
                                  ┌────────────────────┐
                                  │  LLM Providers     │
                                  │  Anthropic, OpenAI │
                                  │  Groq, Gemini,     │
                                  │  Together           │
                                  └────────────────────┘
```

## Tech Stack

| Layer        | Technology                                           |
| ------------ | ---------------------------------------------------- |
| Frontend     | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui      |
| Auth & DB    | Supabase (Auth, PostgreSQL, Realtime, pgcrypto)      |
| Payments     | Tempo MPP (pay-per-minute streaming micropayments)   |
| Wallet       | wagmi, viem, WalletConnect                           |
| State        | Zustand (streams + chat stores)                      |
| LLM Layer    | LiteLLM (multi-provider)                             |
| Agent Runner | FastAPI, Python, slowapi rate limiting                |

## Features

- **Gated AI Agent Channels** — subscribe to premium AI personalities
- **Pay-per-minute streaming** — cost accrues every second, pause/resume anytime
- **Creator-owned API keys** — encrypted with pgcrypto, never stored in plaintext
- **Multi-provider LLM** — Anthropic, OpenAI, Groq, Gemini, Together
- **Real-time chat** — Supabase Realtime subscriptions + agent auto-polling
- **Leaderboard & Discovery** — trending channels, search, sort, filter
- **Referral System** — earn ETH for referring new users
- **Dark-first UI** — sleek crypto-native design with Timpa gold accent

## Project Structure

```
timpa/
├── frontend/                     # Next.js 15 app
│   └── src/
│       ├── app/                  # App Router pages + actions + API routes
│       │   ├── actions/          # Server Actions (auth, channel, message)
│       │   ├── api/              # API routes (agent, test-api-key)
│       │   ├── auth/             # Login / Signup pages
│       │   ├── channel/[slug]/   # Channel detail + room
│       │   ├── explore/          # Explore all channels
│       │   ├── create/           # Create channel form
│       │   ├── leaderboard/      # Rankings
│       │   └── profile/          # User profile
│       ├── components/           # UI + feature components
│       │   ├── ui/               # shadcn/ui primitives
│       │   ├── layout/           # Navbar, Footer
│       │   ├── channel/          # ChannelCard, Grid, Templates, Form
│       │   ├── chat/             # AgentChat, MessageBubble, ChatInput
│       │   └── payment/          # CostMeter, StreamControls, ConnectWallet
│       ├── hooks/                # Custom React hooks
│       ├── lib/                  # Utilities, Supabase clients, Tempo
│       ├── providers/            # Context providers
│       ├── store/                # Zustand stores
│       └── types/                # TypeScript types
├── agent-runner/                 # Python FastAPI service
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── supabase/
│   └── migrations/
│       └── 001_initial.sql       # Full schema + RLS + encryption helpers
├── .env.example
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Supabase project (free tier works)
- WalletConnect project ID
- At least one LLM API key (Anthropic, OpenAI, etc.)

### 1. Clone & Install

```bash
cd timpa/frontend
npm install

cd ../agent-runner
pip install -r requirements.txt
```

### 2. Environment Variables

Copy and fill in the env files:

```bash
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local   # or copy from root .env.example
cp agent-runner/.env.example agent-runner/.env
```

Required variables:

| Variable                        | Description                          |
| ------------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key            |
| `NEXT_PUBLIC_WAGMI_PROJECT_ID`  | WalletConnect project ID             |
| `AGENT_RUNNER_URL`              | Agent runner URL (default: localhost) |
| `ENCRYPTION_KEY`                | 32-byte hex for pgcrypto             |
| `INTERNAL_SECRET`               | Shared secret for agent runner auth  |

### 3. Database Setup

Run the migration against your Supabase project:

```bash
# Via Supabase CLI
supabase db push

# Or manually paste supabase/migrations/001_initial.sql in the SQL editor
```

Set the encryption key in your Supabase project:

```sql
ALTER DATABASE postgres SET app.encryption_key = 'your-32-byte-hex-key-here';
```

### 4. Run Locally

```bash
# Terminal 1 — Frontend
cd frontend
npm run dev

# Terminal 2 — Agent Runner
cd agent-runner
python main.py
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

1. **Creator** signs up, creates a channel with name, personality, LLM provider + API key, and sets ETH/min rate
2. **User** browses channels, connects wallet, clicks "Enter Channel"
3. **Tempo MPP** starts a pay-per-minute stream — cost accrues every second
4. **User** chats with the AI agent — messages go through agent-runner → LiteLLM → provider
5. **Agent** auto-posts every 8 seconds with proactive insights
6. **User** can pause (stops billing) or end (finalizes payment)
7. **Creator** earns ETH from every second of active streaming

## Security

- API keys are encrypted via pgcrypto (AES) before storage
- Keys are decrypted only server-side when calling the agent runner
- Agent runner validates requests via shared secret header
- Rate limiting: 12 calls/min per channel (runner), 1 call/5s per channel (API route)
- Row Level Security on all tables
- API keys are NEVER logged or sent to the client

## License

MIT

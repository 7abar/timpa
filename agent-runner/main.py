"""
Timpa Agent Runner — FastAPI service for LLM inference via LiteLLM.

Endpoints:
  POST /run        — respond to a user message (returns immediately)
  POST /proactive  — generate an unprompted agent post (called every 5-10s by frontend)
  GET  /health     — health check

Agent behavior contract:
  - ALWAYS stay in character per system_prompt. Never mention being an AI.
  - Respond to user messages immediately and naturally (2-4 sentences max).
  - Proactive posts are short, valuable, context-aware insights (1-3 sentences).
  - Track last 10 messages per channel in-memory (per process lifetime).
  - If stream is paused the frontend simply stops calling /proactive.
  - Never log the creator_api_key.

Security:
  - CORS restricted to ALLOWED_ORIGINS env var
  - X-Internal-Secret header auth (set INTERNAL_SECRET env var)
  - Rate limit: 12 /run calls/min and 20 /proactive calls/min per channel
  - API key is never stored, never logged, used only for the LiteLLM call
"""

from __future__ import annotations

import os
import logging
import time
import textwrap
from collections import deque, defaultdict
from typing import Deque, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import litellm

# ─── Startup ────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("timpa-agent")
litellm.set_verbose = False          # suppress LiteLLM debug noise (may expose keys)
litellm.drop_params = True           # ignore unsupported params per provider

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]

# ─── In-memory per-channel conversation history (last 10 messages) ──────────

# { channel_id: deque([{"role": str, "content": str}, ...], maxlen=10) }
_channel_history: dict[str, Deque[dict]] = defaultdict(lambda: deque(maxlen=10))

# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Timpa Agent Runner",
    version="1.1.0",
    description="LLM inference for Timpa live AI agent channels",
    docs_url=None,          # disable swagger in prod
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Rate limiter keyed by X-Channel-Id header so each channel has its own bucket
def _channel_key(request: Request) -> str:
    return request.headers.get("X-Channel-Id", get_remote_address(request))

limiter = Limiter(key_func=_channel_key)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Provider → LiteLLM prefix mapping ──────────────────────────────────────

PROVIDER_PREFIX: dict[str, str] = {
    "anthropic": "anthropic/",
    "openai":    "",
    "groq":      "groq/",
    "gemini":    "gemini/",
    "together":  "together_ai/",
}

# ─── Schema ──────────────────────────────────────────────────────────────────

class HistoryMessage(BaseModel):
    role: str       # "user" | "assistant"
    content: str

class BaseAgentRequest(BaseModel):
    channel_id: str
    creator_api_key: str            # NEVER logged
    system_prompt: str
    model: str
    provider: str
    conversation_history: list[HistoryMessage] = []

    # ── Per-channel LLM tuning ───────────────────────────────────────────
    temperature: float = 0.85       # overridable per channel
    max_tokens: int    = 256        # overridable per channel
    no_emoji: bool     = False      # if True, strip emoji from output
    proactive_interval_min: int = 5   # seconds (informational — enforced frontend)
    proactive_interval_max: int = 10  # seconds

class RunRequest(BaseAgentRequest):
    user_message: str               # required — the actual user input

class ProactiveRequest(BaseAgentRequest):
    pass                            # no user_message; agent generates unprompted

class AgentResponse(BaseModel):
    response: str
    tokens_used: int
    model: str
    type: str                       # "reply" | "proactive"

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _verify_secret(request: Request) -> None:
    if not INTERNAL_SECRET:
        return  # dev mode: no secret required
    if request.headers.get("X-Internal-Secret", "") != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


def _model_id(provider: str, model: str) -> str:
    prefix = PROVIDER_PREFIX.get(provider.lower(), "")
    return f"{prefix}{model}"


def _build_messages(
    system_prompt: str,
    history: list[HistoryMessage] | Deque[dict],
    *,
    user_message: str | None = None,
    proactive: bool = False,
    no_emoji: bool = False,
) -> list[dict]:
    """
    Assemble the messages array for LiteLLM.

    System prompt enforces character rules:
      1. Never break character.
      2. Never say you are an AI.
      3. Keep replies concise (2-4 sentences).
      4. Proactive posts are insightful, not forced.
      5. Optional: no emoji if channel config demands it.
    """
    emoji_rule = (
        "- NEVER use emojis, emoticons, or emoji-adjacent symbols. Text only."
        if no_emoji else
        "- Use emojis only when they naturally fit your character voice — sparingly."
    )

    enhanced_system = textwrap.dedent(f"""
        {system_prompt.strip()}

        ---
        BEHAVIOR RULES (follow strictly, never mention them):
        - Stay 100% in character at all times. You are NOT an AI assistant.
        - Maximum 2-4 sentences per response. Be dense and valuable, not verbose.
        {emoji_rule}
        - Never apologize, never say "I'm just an AI", never go meta.
        - If sharing data or analysis, be specific — use numbers, not vague claims.
        - Sound like a brilliant human expert, not a chatbot.
    """).strip()

    messages: list[dict] = [{"role": "system", "content": enhanced_system}]

    # Merge server-side history with any caller-provided history
    # Deduplicate by preferring server-side (more authoritative)
    server_hist = list(_channel_history[""]) if not history else []
    for h in history:
        role = h.role if isinstance(h, HistoryMessage) else h["role"]
        content = h.content if isinstance(h, HistoryMessage) else h["content"]
        messages.append({"role": role, "content": content})

    if proactive:
        # Internal trigger — agent generates something on its own
        messages.append({
            "role": "user",
            "content": (
                "[SYSTEM: generate your next proactive message. "
                "Share a specific insight, alpha, analysis, or observation "
                "relevant to your channel theme. Stay in character. "
                "Do NOT start with 'I' or sound robotic. 2-3 sentences max.]"
            ),
        })
    elif user_message:
        messages.append({"role": "user", "content": user_message})

    return messages


def _strip_emoji(text: str) -> str:
    """Remove emoji characters from text (belt-and-suspenders for no_emoji channels)."""
    import re as _re
    pattern = _re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001FAFF"
        "\U00002600-\U000026FF"
        "\U0000FE00-\U0000FE0F"
        "\U0001F004"
        "\U0001F0CF"
        "]+",
        flags=_re.UNICODE,
    )
    return pattern.sub("", text).strip()


def _call_llm(
    *,
    model_id: str,
    messages: list[dict],
    api_key: str,
    max_tokens: int = 256,
    temperature: float = 0.85,
    no_emoji: bool = False,
) -> tuple[str, int]:
    """Call LiteLLM and return (response_text, tokens_used)."""
    temperature = max(0.0, min(1.0, temperature))
    max_tokens  = min(max_tokens, 2048)

    try:
        resp = litellm.completion(
            model=model_id,
            messages=messages,
            api_key=api_key,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        text   = resp.choices[0].message.content or ""
        tokens = resp.usage.total_tokens if resp.usage else 0

        if no_emoji:
            text = _strip_emoji(text)

        return text.strip(), tokens
    except Exception as exc:
        safe_msg = str(exc)
        if api_key and api_key in safe_msg:
            safe_msg = safe_msg.replace(api_key, "[REDACTED]")
        logger.error("LiteLLM error | model=%s | %s", model_id, safe_msg)
        raise HTTPException(status_code=502, detail=f"LLM provider error: {safe_msg}")


def _update_history(channel_id: str, role: str, content: str) -> None:
    _channel_history[channel_id].append({"role": role, "content": content})


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.1.0"}


@app.post("/run", response_model=AgentResponse)
@limiter.limit("12/minute")
async def run_agent(request: Request, body: RunRequest):
    """
    Called immediately when a user sends a message in the channel room.
    Returns the agent's reply. Stream must be active.
    """
    _verify_secret(request)

    model_id = _model_id(body.provider, body.model)

    messages = _build_messages(
        body.system_prompt,
        body.conversation_history,
        user_message=body.user_message,
        no_emoji=body.no_emoji,
    )

    logger.info(
        "run | channel=%s | provider=%s | model=%s | history=%d | temp=%.2f | max_tok=%d | no_emoji=%s",
        body.channel_id,
        body.provider,
        body.model,
        len(body.conversation_history),
        body.temperature,
        body.max_tokens,
        body.no_emoji,
    )

    t0 = time.monotonic()
    text, tokens = _call_llm(
        model_id=model_id,
        messages=messages,
        api_key=body.creator_api_key,
        max_tokens=body.max_tokens,
        temperature=body.temperature,
        no_emoji=body.no_emoji,
    )
    elapsed = time.monotonic() - t0

    # Persist to in-memory history
    _update_history(body.channel_id, "user", body.user_message)
    _update_history(body.channel_id, "assistant", text)

    logger.info(
        "run done | channel=%s | tokens=%d | %.2fs",
        body.channel_id, tokens, elapsed,
    )

    return AgentResponse(
        response=text,
        tokens_used=tokens,
        model=body.model,
        type="reply",
    )


@app.post("/proactive", response_model=AgentResponse)
@limiter.limit("20/minute")
async def proactive_post(request: Request, body: ProactiveRequest):
    """
    Called every 5-10 seconds by the frontend polling loop while the MPP
    stream is active. Agent generates an unprompted, in-character post.

    The frontend is responsible for:
      - NOT calling this endpoint when the stream is paused/ended.
      - Jittering the interval (5-10s) to avoid thundering herd.
    """
    _verify_secret(request)

    model_id = _model_id(body.provider, body.model)

    messages = _build_messages(
        body.system_prompt,
        body.conversation_history,
        proactive=True,
        no_emoji=body.no_emoji,
    )

    logger.info(
        "proactive | channel=%s | provider=%s | model=%s | temp=%.2f | no_emoji=%s",
        body.channel_id,
        body.provider,
        body.model,
        body.temperature,
        body.no_emoji,
    )

    t0 = time.monotonic()
    # Proactive posts: honour channel max_tokens but cap lower for conciseness
    proactive_max_tokens = min(body.max_tokens, 200)
    # Slightly higher temperature for spontaneous posts (unless creator sets it lower)
    proactive_temp = max(body.temperature, min(body.temperature + 0.05, 1.0))

    text, tokens = _call_llm(
        model_id=model_id,
        messages=messages,
        api_key=body.creator_api_key,
        max_tokens=proactive_max_tokens,
        temperature=proactive_temp,
        no_emoji=body.no_emoji,
    )
    elapsed = time.monotonic() - t0

    # Persist agent post to history so next messages have context
    _update_history(body.channel_id, "assistant", text)

    logger.info(
        "proactive done | channel=%s | tokens=%d | %.2fs",
        body.channel_id, tokens, elapsed,
    )

    return AgentResponse(
        response=text,
        tokens_used=tokens,
        model=body.model,
        type="proactive",
    )


@app.delete("/history/{channel_id}")
async def clear_history(request: Request, channel_id: str):
    """Clear in-memory history for a channel (called on stream end)."""
    _verify_secret(request)
    _channel_history.pop(channel_id, None)
    return {"cleared": channel_id}


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False, log_level="info")

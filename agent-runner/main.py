"""
Timpa Agent Runner — FastAPI service for LLM inference
Uses LiteLLM to support Anthropic, OpenAI, Groq, Gemini, Together.

POST /run   — generate agent response
GET  /health — health check

Security:
  - CORS restricted to ALLOWED_ORIGINS
  - Shared secret via X-Internal-Secret header
  - Never logs API keys
"""

import os
import logging
import time
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import litellm

# Load .env
load_dotenv()

# Configure logging — NEVER log API keys
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("timpa-agent-runner")

# Disable LiteLLM verbose logging that might leak keys
litellm.set_verbose = False

# -------------------------------------------------------------------
# App setup
# -------------------------------------------------------------------
app = FastAPI(
    title="Timpa Agent Runner",
    description="LLM inference service for Timpa AI Agent channels",
    version="1.0.0",
)

# CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in allowed_origins],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Rate limiter: 12 calls/minute per channel
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Internal secret
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "")

# -------------------------------------------------------------------
# Models
# -------------------------------------------------------------------

class ConversationMessage(BaseModel):
    role: str
    content: str


class RunRequest(BaseModel):
    channel_id: str
    user_message: Optional[str] = None
    creator_api_key: str
    system_prompt: str
    model: str
    provider: str
    conversation_history: list[ConversationMessage] = []


class RunResponse(BaseModel):
    response: str
    tokens_used: int
    model: str


# -------------------------------------------------------------------
# Auth middleware
# -------------------------------------------------------------------

def verify_secret(request: Request):
    """Verify the X-Internal-Secret header matches."""
    if not INTERNAL_SECRET:
        return  # No secret configured — skip (dev mode)
    header_secret = request.headers.get("X-Internal-Secret", "")
    if header_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Invalid internal secret")


# -------------------------------------------------------------------
# Provider model prefix mapping for LiteLLM
# -------------------------------------------------------------------

PROVIDER_PREFIXES = {
    "anthropic": "anthropic/",   # e.g. anthropic/claude-3-opus-20240229
    "openai": "",                # default provider
    "groq": "groq/",
    "gemini": "gemini/",
    "together": "together_ai/",
}


# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/run", response_model=RunResponse)
@limiter.limit("12/minute")
async def run_agent(request: Request, body: RunRequest):
    verify_secret(request)

    # Build model identifier for LiteLLM
    prefix = PROVIDER_PREFIXES.get(body.provider, "")
    model_id = f"{prefix}{body.model}"

    # Build messages array
    messages = [{"role": "system", "content": body.system_prompt}]

    # Add conversation history (last 10)
    for msg in body.conversation_history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})

    # If there's a new user message, add it
    if body.user_message:
        messages.append({"role": "user", "content": body.user_message})
    elif not body.conversation_history:
        # No user message and no history — proactive agent post
        messages.append({
            "role": "user",
            "content": (
                "Continue the conversation proactively. Share an interesting "
                "insight, observation, or piece of analysis related to your "
                "expertise. Keep it concise (1-3 sentences) and engaging."
            ),
        })

    logger.info(
        "Running agent | channel=%s | provider=%s | model=%s | msgs=%d",
        body.channel_id,
        body.provider,
        body.model,
        len(messages),
    )

    start = time.time()

    try:
        response = litellm.completion(
            model=model_id,
            messages=messages,
            api_key=body.creator_api_key,
            max_tokens=512,
            temperature=0.8,
        )
    except Exception as e:
        logger.error("LiteLLM error for channel %s: %s", body.channel_id, str(e))
        raise HTTPException(
            status_code=502,
            detail=f"LLM provider error: {str(e)}"
        )

    elapsed = time.time() - start

    # Extract response
    agent_response = response.choices[0].message.content or ""
    tokens_used = response.usage.total_tokens if response.usage else 0

    logger.info(
        "Agent response | channel=%s | tokens=%d | time=%.2fs",
        body.channel_id,
        tokens_used,
        elapsed,
    )

    return RunResponse(
        response=agent_response,
        tokens_used=tokens_used,
        model=body.model,
    )


# -------------------------------------------------------------------
# Entry point
# -------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )

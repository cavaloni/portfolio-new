# Anonymous User Support Guide

This guide explains the implementation and configuration of anonymous user support in the carbon-aware LLM proxy.

## Overview

Anonymous users can now use the application for a limited number of prompts (default: 5) without signing up. The system tracks usage server-side using a combination of:

1. **Cookie-based session ID** (primary) - Persists across browser tabs and refreshes
2. **IP address** (fallback) - Used when cookies are unavailable

## Architecture

### Backend Components

#### 1. Anonymous Session Service (`packages/backend/src/services/anonymous-session.service.ts`)
- Manages anonymous user sessions and credit tracking
- Generates secure session IDs stored in HTTP-only cookies
- Tracks credit usage in Redis with TTL
- Provides API for consuming, checking, and resetting credits

**Key Methods:**
- `getSessionId(req, res)` - Get or create anonymous session ID
- `getRemainingCredits(req, res)` - Get remaining credits for session
- `consumeCredit(req, res)` - Consume one credit and return updated state
- `hasCreditsRemaining(req, res)` - Check if credits are available

#### 2. Chat Route Updates (`packages/backend/src/routes/v1/chat.ts`)
- Uses `anonymousSessionService` to gate anonymous users
- Consumes credits before processing chat completions
- Returns 403 with `FREE_TIER_EXHAUSTED` code when limit reached
- Authenticated users bypass credit checks entirely

#### 3. Auth Controller Updates (`packages/backend/src/controllers/auth.controller.ts`)
- `getCurrentUser()` now returns real-time credit data for anonymous users
- Returns `isAnonymous`, `creditsRemaining`, `creditsLimit`, `creditsUsed`
- Authenticated users get their full profile

### Frontend Components

#### 1. Type Definitions (`packages/frontend/src/types/user.ts`)
- Added `AnonymousUser` interface with credit tracking fields
- Supports union types for authenticated vs anonymous users

#### 2. User Service (`packages/frontend/src/services/user-service.ts`)
- `getCurrentUser()` returns `UserProfile | AnonymousUser | null`
- Properly discriminates between anonymous and authenticated responses

#### 3. Free Prompts Gate Hook (`packages/frontend/src/hooks/use-free-prompts-gate.ts`)
- **Changed from localStorage to backend API**
- Fetches real credit state from `/v1/users/me`
- Provides `refreshCredits()` to manually update state
- Returns `isLoading` flag for better UX

## Environment Variables

### Required Variables

```bash
# Redis Configuration (required for anonymous tracking)
REDIS_URL=redis://localhost:6379
# OR
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password  # Optional

# Anonymous User Credits
ANONYMOUS_FREE_CREDITS=5           # Default: 5 prompts
FREE_PROMPTS_WINDOW_SEC=86400      # Default: 24 hours (86400 seconds)

# Existing variables (keep as-is)
ROUTING_MOCK_ENABLED=false
NODE_ENV=development
```

### Docker Compose Override

The `docker-compose.override.yml` already supports these environment variables:

```yaml
environment:
  - ROUTING_MOCK_ENABLED=${ROUTING_MOCK_ENABLED:-false}
  - ANONYMOUS_FREE_CREDITS=${ANONYMOUS_FREE_CREDITS:-5}
  - FREE_PROMPTS_WINDOW_SEC=${FREE_PROMPTS_WINDOW_SEC:-86400}
```

## Setup Instructions

### 1. Ensure Redis is Running

**Docker (recommended):**
```bash
# Redis is included in docker-compose.yml
make dev-up-mock
```

**Local Development:**
```bash
# Install Redis
brew install redis  # macOS
sudo apt-get install redis  # Ubuntu

# Start Redis
redis-server
```

### 2. Configure Environment Variables

Create or update `.env` files:

**Backend** (`packages/backend/.env`):
```bash
REDIS_URL=redis://localhost:6379
ANONYMOUS_FREE_CREDITS=5
FREE_PROMPTS_WINDOW_SEC=86400
NODE_ENV=development
```

### 3. Install Dependencies

```bash
cd packages/backend
npm install
```

### 4. Start the Application

```bash
# Using Docker (recommended)
make dev-up-mock

# OR manually
cd packages/backend && npm run dev
cd packages/frontend && npm run dev
```

## Testing Anonymous User Flow

### 1. Test Anonymous User Endpoint

```bash
# Get anonymous user info (no auth)
curl http://localhost:3000/v1/users/me \
  -H "Content-Type: application/json"

# Expected response:
{
  "success": true,
  "data": {
    "isAnonymous": true,
    "creditsRemaining": 5,
    "creditsLimit": 5,
    "creditsUsed": 0
  }
}
```

### 2. Test Chat Completion (Anonymous)

```bash
# Send a chat completion request
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "deploymentId": "mock-mistralai-ministral-8b-us-east",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'

# Check remaining credits
curl http://localhost:3000/v1/users/me

# Expected response after 1 prompt:
{
  "success": true,
  "data": {
    "isAnonymous": true,
    "creditsRemaining": 4,
    "creditsLimit": 5,
    "creditsUsed": 1
  }
}
```

### 3. Test Credit Exhaustion

```bash
# Make 5 requests to exhaust credits
for i in {1..5}; do
  curl -X POST http://localhost:3000/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
      "deploymentId": "mock-mistralai-ministral-8b-us-east",
      "messages": [{"role": "user", "content": "Test '$i'"}],
      "stream": false
    }'
done

# 6th request should fail with 403
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "deploymentId": "mock-mistralai-ministral-8b-us-east",
    "messages": [{"role": "user", "content": "Should fail"}],
    "stream": false
  }'

# Expected error response:
{
  "success": false,
  "code": "FREE_TIER_EXHAUSTED",
  "message": "Free prompt limit reached. Please sign in to continue.",
  "data": {
    "used": 5,
    "limit": 5,
    "remaining": 0
  }
}
```

### 4. Test with Authentication

```bash
# Login first
TOKEN=$(curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  | jq -r '.data.token')

# Send authenticated request (no limits)
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "deploymentId": "mock-mistralai-ministral-8b-us-east",
    "messages": [{"role": "user", "content": "Authenticated request"}],
    "stream": false
  }'
```

## Troubleshooting

### Redis Connection Issues

**Symptom:** Errors like "Redis client is not connected"

**Solution:**
```bash
# Check Redis status
redis-cli ping  # Should return "PONG"

# Check Redis URL
echo $REDIS_URL

# Verify backend can connect
cd packages/backend
npm run dev  # Check logs for "Redis client connected"
```

### Credits Not Persisting

**Symptom:** Credits reset on browser refresh

**Causes:**
1. Cookies not being set (check browser dev tools → Application → Cookies)
2. SameSite cookie policy blocking (check `cookie-config.ts` settings)
3. Redis not persisting data

**Solution:**
```bash
# Check if cookie is set
# Browser DevTools → Application → Cookies → look for "anon_session_id"

# Check Redis keys
redis-cli KEYS "anon_credits:*"

# Check TTL
redis-cli TTL "anon_credits:anon_<session_id>"
```

### TypeScript Errors

**Symptom:** Cannot find module 'express' or '@types/node'

**Solution:**
```bash
cd packages/backend
npm install
# OR
npm install --save-dev @types/node @types/express
```

## API Reference

### GET `/v1/users/me`

**Authentication:** Optional (uses `authenticateOptional` middleware)

**Response (Anonymous):**
```json
{
  "success": true,
  "data": {
    "isAnonymous": true,
    "creditsRemaining": 3,
    "creditsLimit": 5,
    "creditsUsed": 2
  }
}
```

**Response (Authenticated):**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "User Name",
    ...
  }
}
```

### POST `/v1/chat/completions`

**Authentication:** Optional (anonymous users are rate-limited)

**Error Response (Credits Exhausted):**
```json
{
  "success": false,
  "code": "FREE_TIER_EXHAUSTED",
  "message": "Free prompt limit reached. Please sign in to continue.",
  "data": {
    "used": 5,
    "limit": 5,
    "remaining": 0
  }
}
```

## Security Considerations

1. **Cookie Security:**
   - HTTP-only cookies prevent XSS attacks
   - Secure flag enabled in production
   - SameSite policy protects against CSRF

2. **Rate Limiting:**
   - Redis-backed tracking prevents client-side manipulation
   - IP fallback prevents cookie deletion bypass
   - TTL ensures limits reset after window expires

3. **Session ID Generation:**
   - Cryptographically secure random bytes (64 hex characters)
   - Validated against regex pattern before use

## Performance Notes

- Redis operations are non-blocking and fast (<1ms)
- Failed Redis operations don't block chat requests (logged as warnings)
- Session cookies persist for 30 days by default
- Credit tracking keys auto-expire based on `FREE_PROMPTS_WINDOW_SEC`

## Future Enhancements

1. **Fingerprinting:** Add browser fingerprinting for additional tracking
2. **Analytics:** Track anonymous vs authenticated usage patterns
3. **Progressive Limits:** Offer more credits based on engagement
4. **Captcha:** Add captcha after exhausting free credits
5. **Email Capture:** Prompt for email before final free credit

## Monitoring

### Redis Health Check

```bash
# Check Redis connection
redis-cli INFO | grep connected_clients

# Check memory usage
redis-cli INFO | grep used_memory_human

# View all anonymous session keys
redis-cli KEYS "anon_credits:*" | wc -l
```

### Application Metrics

Monitor these metrics in your logging system:
- Anonymous credit consumption rate
- Free tier exhaustion events (`FREE_TIER_EXHAUSTED`)
- Conversion rate (anonymous → authenticated)
- Average credits used before sign-up

## Support

For issues or questions:
1. Check the [CLAUDE.md](./CLAUDE.md) file for codebase context
2. Review Redis connection logs in `packages/backend/src/services/redis.service.ts`
3. Enable debug logging: `LOG_LEVEL=debug npm run dev`

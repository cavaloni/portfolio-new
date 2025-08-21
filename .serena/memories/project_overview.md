# Airth - Carbon-Aware LLM Proxy Gateway

## Project Purpose
A carbon-aware proxy gateway for Large Language Models (LLMs) that intelligently routes requests to the most carbon-efficient model based on real-time carbon intensity data and user preferences.

## Key Features
- **Dynamic Multi-Model Routing**: Routes requests to optimal deployments based on user preferences (speed, cost, quality, green)
- **Carbon-Aware Intelligence**: Uses real-time carbon intensity data to minimize environmental impact
- **User Preference Joystick**: Interactive quadrant joystick for setting AI preferences
- **Multi-Region Support**: Supports deployments across different regions
- **Real-time Warming**: Presence-based warming system to optimize cold starts
- **Secure HMAC Authentication**: Backend signs requests, workers validate for security

## Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS, Radix UI
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Redis, TypeORM
- **Workers**: Python Modal deployments with OpenAI-compatible endpoints
- **Database**: PostgreSQL with TypeORM migrations
- **Cache/Session**: Redis with password/TLS support
- **Deployment**: Docker, Yarn workspaces, Fly.io ready
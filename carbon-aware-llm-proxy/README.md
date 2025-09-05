# Carbon-Aware LLM Meta-Aggregator/Proxy Gateway

A carbon-aware proxy gateway for Large Language Models (LLMs) that intelligently routes requests to the most carbon-efficient model based on real-time carbon intensity data.

## 🌟 Features

- **Carbon-Aware Routing**: Routes requests to the most carbon-efficient model based on real-time data
- **Multi-Model Support**: Works with multiple LLM providers (OpenAI, Anthropic, etc.)
- **Real-time Monitoring**: Live carbon intensity data and model performance metrics
- **User Preferences**: Customizable routing based on user preferences (carbon vs. performance vs. cost)
- **Analytics Dashboard**: Visualize carbon savings and model performance
- **WebSocket Support**: Real-time updates for carbon intensity and model recommendations

## 🏗️ Architecture

```
┌─────────────────┐     ┌───────────────────────┐     ┌──────────────────┐
│                 │     │                       │     │                  │
│   Frontend      │────▶│   Backend API        │◀───▶│  Database        │
│   (Next.js)     │     │   (Node.js/Express)  │     │  (PostgreSQL)    │
│                 │     │                       │     │                  │
└────────┬────────┘     └───────────┬───────────┘     └────────┬─────────┘
         │                          │                          │
         │                          │                          │
         │                          │                          │
         │                  ┌───────▼───────────┐              │
         │                  │                   │              │
         └─────────────────▶│   WebSocket       │              │
                            │   Server          │              │
                            │                   │              │
                            └────────┬──────────┘              │
                                     │                         │
                            ┌────────▼──────────┐    ┌─────────▼─────────┐
                            │                   │    │                   │
                            │   Redis Cache     │    │   External APIs   │
                            │                   │    │   (WattTime,      │
                            └───────────────────┘    │    ElectricityMap)  │
                                                     │                   │
                                                     └───────────────────┘
```

## 🚀 Getting Started

### Prerequisites

**For Docker Setup (Recommended):**

- Docker Engine 20.10+
- Docker Compose Plugin 2.0+ (or Docker Desktop with Compose V2)
- 4GB+ RAM available for containers
- 10GB+ free disk space

**For Local Development:**

- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- API keys for:
  - ElectricityMap (for carbon intensity data)
  - WattTime (for carbon intensity forecasts)
  - LLM providers (OpenAI, Anthropic, etc.)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/carbon-aware-llm-proxy.git
   cd carbon-aware-llm-proxy
   ```

2. Install dependencies:

   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd packages/backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Set up environment variables:

   ```bash
   # Copy the example .env file
   cp .env.example .env

   # Update the .env file with your API keys and configuration
   # See .env.example for all required variables
   ```

4. Start the development environment:

   **Option A: Quick Docker Setup (Recommended)**

   ```bash
   # Run the automated setup script
   ./scripts/docker-dev.sh
   ```

   **Option B: Manual Docker Setup**

   ```bash
   # Copy Docker environment template
   cp .env.docker .env

   # Start all services with Docker Compose
   docker compose up -d

   # Run database migrations
   docker compose exec backend npm run migration:run
   ```

   **Option C: Local Development (without Docker)**

   ```bash
   # Start database and Redis with Docker
   docker compose up -d postgres redis

   # Run database migrations
   cd packages/backend
   npm run migration:run

   # Start backend in development mode
   npm run dev

   # In a new terminal, start the frontend
   cd packages/frontend
   npm run dev
   ```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

## 🐳 Docker Setup

For comprehensive Docker setup instructions, see [DOCKER.md](./DOCKER.md).

### Quick Commands

```bash
# Development
make dev              # Start development environment
make dev-logs         # View logs
make migrate          # Run database migrations
make health           # Check service health

# Production
make prod             # Deploy to production
make prod-logs        # View production logs
make backup           # Create database backup

# Utilities
make status           # Show service status
make clean            # Clean up Docker resources

# Troubleshooting
make fix-build        # Fix common build issues
make troubleshoot     # Interactive troubleshooting
./scripts/fix-build-issues.sh  # Quick build fix
```

## 📦 Deployment

### Production Deployment with Docker

1. **Configure production environment:**

   ```bash
   cp .env.production .env
   # Update all CHANGE_THIS_* values with secure configurations
   ```

2. **Deploy using the automated script:**

   ```bash
   ./scripts/docker-prod.sh
   ```

3. **Or deploy manually:**
   ```bash
   docker compose -f docker-compose.prod.yml build --no-cache
   docker compose -f docker-compose.prod.yml up -d
   docker compose -f docker-compose.prod.yml exec backend npm run migration:run
   ```

### Vercel Deployment (Frontend)

1. Install Vercel CLI:

   ```bash
   npm install -g vercel
   ```

2. Deploy the frontend:
   ```bash
   cd packages/frontend
   vercel
   ```

### Server Deployment (Backend)

1. Set up a production server with Docker and Docker Compose
2. Copy the production docker-compose file and environment variables
3. Start the services:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## 🔧 Configuration

### Environment Variables

See `.env.example` for all available configuration options. For provider configuration, we now use a simple Modal setup:

- `LLM_PROVIDER=modal`
- `MODAL_ENDPOINT_URL=https://<your-modal-app>.modal.run`
- `MODAL_API_KEY=<optional-shared-secret>`

### Database Migrations

To create a new migration:

```bash
cd packages/backend
npm run typeorm migration:create src/migrations/YourMigrationName
```

To run migrations:

```bash
npm run typeorm migration:run
```

To revert the last migration:

```bash
npm run typeorm migration:revert
```

## 📊 API Documentation

API documentation is available at `/api/docs` when running the backend in development mode.

### Authentication

#### Frontend Password Protection

The frontend includes a simple password protection mechanism that can be configured for deployment environments:

- **Password**: `HardOnRoutly` (hardcoded for demo purposes)
- **Environment Variables**:
  - `NEXT_PUBLIC_DISABLE_AUTH=true` - Disable authentication completely
  - `FORCE_AUTH=true` - Force authentication even in development
  - By default, authentication is disabled in development and enabled in production

#### API Authentication

All protected routes require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### Available Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/models` - List available models
- `POST /api/chat/completions` - Chat completion endpoint (OpenAI-compatible)
- `GET /api/carbon/intensity` - Get carbon intensity for a region
- `GET /api/routing/optimal-model` - Get the optimal model based on current conditions
- `GET /api/ws` - WebSocket endpoint for real-time updates

## 🤝 Contributing

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature`
3. Make your changes and commit them: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [ElectricityMap](https://www.electricitymap.org/) for carbon intensity data
- [WattTime](https://www.watttime.org/) for carbon intensity forecasts
- [TypeORM](https://typeorm.io/) for database ORM
- [Next.js](https://nextjs.org/) and [React](https://reactjs.org/) for the frontend
- [Express](https://expressjs.com/) for the backend API

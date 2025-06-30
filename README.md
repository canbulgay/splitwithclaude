# Splitwise MVP

Track, visualize, and settle shared expenses transparently and automatically.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

4. Configure your database in `apps/api/.env`

### Development

Start all services in development mode:
```bash
pnpm dev
```

This will start:
- Web app at http://localhost:3000
- API server at http://localhost:3001

### Available Scripts

- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Shared**: Common types and utilities package

## Project Structure

```
splitwise/
├── apps/
│   ├── web/          # React frontend
│   └── api/          # Express backend
├── packages/
│   └── shared/       # Shared types and utilities
└── prisma/           # Database schema and migrations
```

## Development Workflow

This project follows a feature-based development approach with comprehensive testing and quality gates. See `CLAUDE.md` for detailed development guidelines.
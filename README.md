# Duty Roster

A modern duty roster scheduling system for nurses, built with TypeScript, Next.js, Hono, tRPC, and more.

## Features

- **Automated Scheduling**: Constraint programming solver using OR-Tools for optimal nurse shift assignments
- **Interactive Roster Management**: View and edit monthly schedules with drag-and-drop interface
- **Admin Dashboard**: Manage users, preferences, and shift allocations
- **Voice Assistant**: Speech-to-text integration for hands-free roster updates (in development)
- **Real-time Updates**: Live schedule synchronization across users
- **Type-Safe APIs**: End-to-end type safety with tRPC
- **Progressive Web App**: Installable PWA for mobile access
- **Authentication**: Secure user management with Better-Auth
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Monorepo**: Turborepo for optimized builds and shared packages

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS, shadcn/ui
- **Backend**: Hono, tRPC, Cloudflare Workers
- **Database**: PostgreSQL, Drizzle ORM
- **Auth**: Better-Auth
- **Solver**: OR-Tools (Python)
- **Voice**: Vosk STT, WebSocket streaming
- **Build**: Turborepo, Bun, Biome

## Getting Started

First, install dependencies:

```bash
bun install
```

## Database Setup

1. Set up a PostgreSQL database
2. Update `apps/server/.env` with your database connection
3. Push the schema:

```bash
bun run db:push
```

## Development

Run all services:

```bash
bun run dev
```

This starts:

- Next.js web app on http://localhost:3001
- Hono server on http://localhost:3000
- Voice server on http://localhost:3002 (when implemented)
- Vosk STT on ws://localhost:5001 (when implemented)

## Voice Assistant Setup (Optional)

For voice features:

1. Install Python dependencies:

```bash
pip install -r stt/requirements.txt
```

2. Download Vosk model:

```bash
bash scripts/setup-stt.sh
```

3. Run voice services separately:

```bash
bun run dev:stt      # Python STT server
bun run dev:voice    # Bun voice relay
```

## Project Structure

```
duty-roster/
├── apps/
│   ├── web/              # Next.js frontend
│   ├── server/           # Hono + tRPC backend
│   └── voice-server/     # Voice WebSocket relay
├── packages/
│   ├── api/              # tRPC router definitions
│   ├── auth/             # Authentication config
│   ├── db/               # Database schema & queries
│   ├── env/              # Environment validation
│   ├── ui/               # Shared UI components
│   └── config/           # Build configuration
├── stt/                  # Vosk speech-to-text
├── docs/                 # Documentation
└── scripts/              # Setup scripts
```

## Development Scripts

- `bun run dev` - Start all services
- `bun run dev:web` - Next.js only
- `bun run dev:server` - Hono server only
- `bun run dev:voice` - Voice server only
- `bun run dev:stt` - STT server only
- `bun run db:push` - Push database schema
- `bun run check` - Lint and format

## Documentation

See `docs/` for detailed documentation:

- `BUSINESS_LOGIC.md` - Scheduling constraints and solver
- `VOICE_ASSISTANT_PRD.md` - Voice features implementation
- `solver_explanation.md` - Technical solver details

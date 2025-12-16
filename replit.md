# SlotManager Pro

## Overview

SlotManager Pro is a professional slot management system designed to track and manage the relationship between phone numbers and IP addresses. The core business logic enforces that each phone and IP can only be used for a maximum of 4 slots within a rolling 15-day window. The system provides a dashboard for monitoring slot usage, managing phones and IPs, and creating new slot assignments while respecting usage limits.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: 
  - TanStack React Query for server state and API caching
  - Custom React Context store (`@/lib/store.tsx`) for client-side state and authentication
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation via `@hookform/resolvers`

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON API with routes prefixed `/api/`
- **Build Tool**: Vite for development, esbuild for production bundling

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - shared between frontend and backend
- **Validation**: Zod schemas generated from Drizzle schemas via `drizzle-zod`
- **Migrations**: Drizzle Kit with `db:push` command

### Core Data Models
1. **Users** - Basic authentication (id, username, password)
2. **Phones** - Phone records (id, phoneNumber, email, remark, createdAt)
3. **IPs** - IP address records (id, ipAddress, port, username, password, provider, remark, createdAt)
4. **Slots** - Many-to-many relationship between phones and IPs with usage tracking (id, phoneId, ipId, count, usedAt)

### Key Business Rules
- Each phone can use maximum 4 slots within the last 15 days (rolling window)
- Each IP can use maximum 4 slots within the last 15 days
- Slot creation is blocked if either phone or IP exceeds their limit
- Slot usage is calculated dynamically from time-based queries, not stored counters

### Authentication
- Simple mock authentication stored in React Context
- Protected routes redirect unauthenticated users to `/login`
- No server-side session management currently implemented (connect-pg-simple is available as a dependency)

### Project Structure
```
├── client/           # Frontend React application
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui components
│   │   ├── hooks/          # Custom React hooks (data fetching)
│   │   ├── lib/            # Utilities, query client, store
│   │   └── pages/          # Page components
├── server/           # Backend Express application
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database access layer
│   └── vite.ts       # Vite dev server integration
├── shared/           # Shared code between frontend/backend
│   └── schema.ts     # Drizzle schema definitions
└── migrations/       # Database migrations (generated)
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connected via `DATABASE_URL` environment variable
- **Drizzle ORM**: Database access and schema management

### UI Framework
- **Radix UI**: Headless UI primitives (dialog, dropdown, select, etc.)
- **shadcn/ui**: Pre-built component library using Radix + Tailwind
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Development server with HMR
- **Replit Plugins**: 
  - `@replit/vite-plugin-runtime-error-modal` - Error overlay
  - `@replit/vite-plugin-cartographer` - Code navigation (dev only)
  - `@replit/vite-plugin-dev-banner` - Development banner (dev only)

### Utilities
- **date-fns**: Date manipulation for slot usage calculations
- **nanoid**: Unique ID generation
- **sonner**: Toast notifications
- **class-variance-authority**: Component variant management
# Werewolf - Multiplayer Social Deduction Game

## Overview

This is a real-time multiplayer Werewolf (Mafia) game built with React and Express. Players can create or join games, receive role assignments, and participate in day/night phases with voting mechanics. The application features a modern UI with a dark theme and atmospheric styling.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the user interface
- **Vite** as the build tool and development server
- **shadcn/ui** component library with Radix UI primitives
- **TailwindCSS** for styling with custom werewolf-themed design
- **Wouter** for client-side routing
- **TanStack Query** for state management and API calls

### Backend Architecture
- **Express.js** with TypeScript for the REST API
- **WebSocket Server** for real-time game communication
- **Drizzle ORM** for database operations
- **PostgreSQL** for data persistence (via Neon serverless)
- **Session-based** player identification

### Data Storage
- **PostgreSQL** database with the following main tables:
  - `games` - Game state and configuration
  - `players` - Player information and roles
  - `gameActions` - Voting and night actions
  - `chatMessages` - In-game chat system
- **Drizzle ORM** for type-safe database queries
- **In-memory fallback** storage for development

## Key Components

### Game Logic Service
- Role assignment and game state management
- Phase transitions (waiting → night → day → voting)
- Victory condition checking
- Timer management for phases

### WebSocket Communication
- Real-time game updates
- Chat messaging
- Player actions (voting, night actions)
- Game state synchronization

### UI Components
- **InitialScreen** - Game creation/joining interface
- **GameSettings** - Role configuration before game start
- **Lobby** - Player waiting room with game code sharing
- **GameScreen** - Main game interface with overlays for different phases
- **Chat** - Real-time messaging system

## Data Flow

1. **Game Creation**: Host creates game with settings → generates unique game code
2. **Player Joining**: Players join via game code → added to lobby
3. **Game Start**: Host starts game → roles assigned → phase begins
4. **Phase Management**: Game cycles through night/day phases with timers
5. **Real-time Updates**: WebSocket broadcasts keep all players synchronized
6. **Victory Check**: Game ends when win conditions are met

## External Dependencies

### Core Dependencies
- `@neondatabase/serverless` - PostgreSQL database connection
- `drizzle-orm` - Type-safe database ORM
- `ws` - WebSocket server implementation
- `express` - Web server framework

### UI Dependencies
- `@radix-ui/*` - Accessible UI component primitives
- `@tanstack/react-query` - Server state management
- `class-variance-authority` - Styling utilities
- `tailwindcss` - Utility-first CSS framework

### Development Tools
- `tsx` - TypeScript execution for development
- `esbuild` - Fast bundling for production
- `vite` - Frontend build tool and dev server

## Deployment Strategy

### Development
- Uses Vite dev server with HMR
- In-memory storage fallback for quick testing
- WebSocket connection via development proxy

### Production
- Vite builds optimized client bundle to `dist/public`
- esbuild bundles server code to `dist/index.js`
- Serves static files from Express
- PostgreSQL database required via `DATABASE_URL`
- WebSocket server runs on same port as HTTP server

### Replit Configuration
- Configured for Node.js 20 with PostgreSQL 16
- Auto-deployment to autoscale infrastructure
- Port 5000 for development, port 80 for production
- Environment variables for database connection

## Changelog

```
Changelog:
- June 25, 2025: Initial setup
- June 25, 2025: Transformed basic HTML into complete multiplayer Werewolf game
- June 25, 2025: Added medieval theming with castle background and golden effects
- June 25, 2025: Implemented Seer investigation limits (30% of werewolf count, min 3)
- June 25, 2025: Added custom Seer investigation count option in Game Settings
- June 25, 2025: Integrated PostgreSQL database for persistent multiplayer sessions
- June 25, 2025: Enhanced game flow with role reveal countdown, day/night visuals
- June 25, 2025: Implemented advanced bodyguard mechanics and majority voting system
- July 2, 2025: Added comprehensive player disconnection handling system
- July 2, 2025: Created complete README.md documentation with setup and gameplay guides
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
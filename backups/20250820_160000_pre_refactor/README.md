# GameWorldQuest - Werewolf Game

A real-time multiplayer Werewolf (Mafia) game built with React, TypeScript, Express, and PostgreSQL.

## Features

- Real-time multiplayer gameplay with WebSocket support
- Multiple game roles: Werewolf, Seer, Doctor, Sheriff, and more
- Interactive chat system
- Responsive UI built with Tailwind CSS and Radix UI
- Secure game sessions with proper state management

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS + Radix UI components
- WebSocket client for real-time updates

**Backend:**
- Express.js + TypeScript
- WebSocket server (ws library)
- Drizzle ORM with PostgreSQL
- Session-based authentication

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL database
- npm or yarn

## Local Development

1. **Clone the repository**
   ```bash
   git clone [your-repo-url]
   cd GameWorldQuest
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your database URL:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/gameworldquest
   NODE_ENV=development
   ```

4. **Run database migrations**
   ```bash
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`

## Deployment

### Railway (Recommended - Free Tier Available)

1. **Push to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Deploy to Railway**
   - Visit [railway.app](https://railway.app)
   - Sign up/in with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your GameWorldQuest repository
   - Railway will auto-detect the Node.js app

3. **Add PostgreSQL Database**
   - In your Railway project, click "New Service"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically set DATABASE_URL environment variable

4. **Configure Environment Variables**
   - Go to your app service → "Variables"
   - Ensure these are set:
     - `DATABASE_URL` (auto-set by Railway)
     - `NODE_ENV=production`
     - `PORT` (auto-set by Railway)

5. **Deploy**
   - Railway will automatically build and deploy
   - Your app will be available at `https://your-app-name.railway.app`

### Alternative Deployment Options

#### Render.com
The project includes a `render.yaml` for Render deployment (currently configured).

#### Docker Deployment
A Dockerfile is included for container deployment:
```bash
docker build -t gameworldquest .
docker run -p 3000:3000 -e DATABASE_URL=your_db_url gameworldquest
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database

## Game Rules

**Objective:**
- **Villagers:** Eliminate all werewolves
- **Werewolves:** Eliminate all villagers or equal their numbers

**Roles:**
- **Villager:** Basic role, wins with other villagers
- **Werewolf:** Eliminates players during night phase
- **Seer:** Can investigate one player each night
- **Doctor:** Can protect one player each night
- **Sheriff:** Gets extra vote during day phase
- **And more roles configurable in game settings**

**Phases:**
1. **Day Phase:** All players discuss and vote to eliminate someone
2. **Night Phase:** Special roles perform their actions
3. **Resolution:** Actions are resolved and results announced

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions, please open an issue on the GitHub repository.

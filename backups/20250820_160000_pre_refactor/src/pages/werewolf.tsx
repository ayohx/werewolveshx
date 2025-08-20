import { useGameState } from '@/hooks/useGameState';
import InitialScreen from '@/components/werewolf/InitialScreen';
import GameSettings from '@/components/werewolf/GameSettings';
import Lobby from '@/components/werewolf/Lobby';
import GameScreen from '@/components/werewolf/GameScreen';
import RoleRevealOverlay from '@/components/werewolf/overlays/RoleRevealOverlay';

export default function WerewolfGame() {
  const gameState = useGameState();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=1080')"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/40 via-red-900/50 to-black/70 z-0" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 z-0" />
      
      {/* Magical particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
      </div>
      
      {/* Main content */}
      <div className={`relative z-10 text-white flex items-center justify-center min-h-screen p-4 transition-all duration-1000 ${
        gameState.gameState?.phase === 'night' ? 'brightness-50' : 
        gameState.gameState?.phase === 'day' ? 'brightness-110' : ''
      }`}>
        <div className="w-full max-w-5xl mx-auto">
          {gameState.currentScreen === 'initial' && <InitialScreen gameState={gameState} />}
          {gameState.currentScreen === 'settings' && <GameSettings gameState={gameState} />}  
          {gameState.currentScreen === 'lobby' && <Lobby gameState={gameState} />}
          {gameState.currentScreen === 'game' && <GameScreen gameState={gameState} />}
          
          {/* Role Reveal Overlay */}
          {gameState.currentScreen === 'game' && 
           gameState.gameState?.phase === 'role_reveal' && 
           gameState.getPlayerRole() && (
            <RoleRevealOverlay 
              role={gameState.getPlayerRole() || 'villager'}
              phaseTimer={gameState.gameState.phaseTimer || 10}
              gameState={gameState.gameState}
            />
          )}
        </div>
      </div>
    </div>
  );
}

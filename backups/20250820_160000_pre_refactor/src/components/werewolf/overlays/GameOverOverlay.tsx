import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROLE_INFO } from '@/lib/gameTypes';

interface GameOverOverlayProps {
  gameState: any;
}

export default function GameOverOverlay({ gameState }: GameOverOverlayProps) {
  const game = gameState.gameState;
  
  const getWinnerInfo = () => {
    const aliveWerewolves = game?.alivePlayers?.filter((p: any) => p.role === 'werewolf').length || 0;
    const aliveVillagers = game?.alivePlayers?.filter((p: any) => 
      p.role !== 'werewolf' && p.role !== 'minion'
    ).length || 0;
    
    const jesterWon = game?.deadPlayers?.some((p: any) => p.role === 'jester');
    
    if (jesterWon) {
      return {
        title: 'Jester Wins!',
        description: 'The jester was voted out and wins the game!'
      };
    } else if (aliveWerewolves >= aliveVillagers && aliveVillagers > 0) {
      return {
        title: 'Werewolves Win!',
        description: 'The werewolves have taken control of the village.'
      };
    } else if (aliveWerewolves === 0) {
      return {
        title: 'Villagers Win!',
        description: 'All werewolves have been eliminated from the village.'
      };
    } else {
      return {
        title: 'Game Over',
        description: 'The game has ended.'
      };
    }
  };

  const winnerInfo = getWinnerInfo();
  const allPlayers = [...(game?.alivePlayers || []), ...(game?.deadPlayers || [])];

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[70] p-4">
      <Card className="panel max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="font-cinzel text-5xl text-center mb-4">
            {winnerInfo.title}
          </CardTitle>
          <p className="text-xl text-center">{winnerInfo.description}</p>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-4 text-center">Final Roles</h3>
            <div className="space-y-2">
              {allPlayers.map((player: any) => {
                const roleInfo = player.role ? ROLE_INFO[player.role as keyof typeof ROLE_INFO] : null;
                return (
                  <div
                    key={player.playerId}
                    className={`flex justify-between items-center p-2 rounded ${
                      player.isAlive ? 'bg-green-900/30' : 'bg-red-900/30'
                    }`}
                  >
                    <span className="font-bold">{player.name}</span>
                    <span className={roleInfo?.color || 'text-gray-400'}>
                      {roleInfo?.name || player.role}
                      {player.isSheriff ? ' (Sheriff)' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => {
                // Reset game state for new game
                gameState.setShowGameOverOverlay(false);
                gameState.setCurrentScreen('initial');
              }}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg"
            >
              Play Again
            </Button>
            <Button
              onClick={gameState.leaveGame}
              variant="secondary"
              className="text-white font-bold py-3 px-8 rounded-lg"
            >
              Leave Game
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

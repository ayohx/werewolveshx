import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LobbyProps {
  gameState: any;
}

export default function Lobby({ gameState }: LobbyProps) {
  const { toast } = useToast();
  const game = gameState.gameState;

  const copyGameCode = async () => {
    if (game?.game.gameCode) {
      try {
        await navigator.clipboard.writeText(game.game.gameCode);
        toast({
          title: "Copied!",
          description: "Game code copied to clipboard",
        });
      } catch (err) {
        toast({
          title: "Failed to copy",
          description: "Could not copy game code",
          variant: "destructive",
        });
      }
    }
  };

  const canStart = gameState.isHost() && game?.players.length >= 4;

  return (
    <Card className="panel rounded-lg shadow-2xl">
      <CardHeader>
        <CardTitle className="font-cinzel text-4xl font-bold text-center mb-2">
          LOBBY
        </CardTitle>
        <div className="text-center">
          <p className="text-gray-400">Share this code with your friends:</p>
          <div
            onClick={copyGameCode}
            className="bg-gray-800 border border-dashed border-gray-600 rounded-lg py-3 px-4 text-2xl font-bold text-red-400 inline-flex items-center gap-2 mt-2 cursor-pointer hover:bg-gray-700 transition-colors"
          >
            {game?.game.gameCode || 'LOADING...'}
            <Copy className="w-5 h-5" />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div>
          <h3 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2 font-cinzel">
            Players Joined ({game?.players.length || 0}/16)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {game?.players.map((player: any) => (
              <div key={player.playerId} className="bg-gray-800/50 p-3 rounded-lg text-center">
                <span className="font-bold block">{player.name}</span>
                {player.isHost && (
                  <Badge className="text-xs bg-yellow-600 hover:bg-yellow-700 mt-1">
                    HOST
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <Button
            onClick={gameState.leaveGame}
            className="btn-cancel bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg"
          >
            Leave Game
          </Button>
          <Button
            onClick={gameState.startGame}
            disabled={!canStart}
            className="bg-green-700 hover:bg-green-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg shadow-lg"
          >
            Start Game
          </Button>
        </div>
        
        <p className="text-center text-gray-500 mt-2">
          {gameState.isHost() 
            ? game?.players.length < 4 
              ? `Need ${4 - (game?.players.length || 0)} more players to start`
              : 'Ready to start!'
            : 'Waiting for host to start the game...'
          }
        </p>
      </CardContent>
    </Card>
  );
}

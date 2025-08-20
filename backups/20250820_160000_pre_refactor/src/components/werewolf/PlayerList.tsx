import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ROLE_INFO } from '@/lib/gameTypes';

interface PlayerListProps {
  gameState: any;
}

export default function PlayerList({ gameState }: PlayerListProps) {
  const game = gameState.gameState;
  const currentPlayer = gameState.getCurrentPlayer();

  if (!game) return null;

  const allPlayers = [...(game.alivePlayers || []), ...(game.deadPlayers || [])];

  return (
    <Card className="panel rounded-lg shadow-2xl">
      <CardHeader>
        <CardTitle className="font-cinzel text-xl font-bold">Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allPlayers.map((player: any) => {
            const isCurrentPlayer = player.playerId === gameState.playerId;
            const roleInfo = player.role ? ROLE_INFO[player.role as keyof typeof ROLE_INFO] : null;
            
            return (
              <div
                key={player.playerId}
                className={`p-3 rounded-lg border-l-4 transition-opacity ${
                  player.isAlive 
                    ? 'bg-gray-800/50 border-green-500' 
                    : 'bg-gray-900/50 border-red-500 opacity-60'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`font-bold ${
                      isCurrentPlayer ? 'text-yellow-400' : 'text-white'
                    }`}>
                      {player.name}
                      {isCurrentPlayer && player.role && (
                        <span className={`ml-2 ${roleInfo?.color || 'text-gray-400'}`}>
                          ({roleInfo?.name || player.role})
                        </span>
                      )}
                    </span>
                    <div className="flex gap-2 mt-1">
                      {player.isHost && (
                        <Badge className="text-xs bg-yellow-600 hover:bg-yellow-700">
                          HOST
                        </Badge>
                      )}
                      {player.isSheriff && (
                        <Badge className="text-xs bg-blue-600 hover:bg-blue-700">
                          SHERIFF ⭐
                        </Badge>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${
                    player.isAlive ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {player.isAlive ? 'Alive' : 'Dead'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Voting Summary */}
        {game.phase === 'voting' && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="font-bold mb-2">Current Votes</h4>
            <div className="space-y-1 text-sm">
              {Object.entries(
                Object.entries(game.votes || {}).reduce((acc: Record<string, number>, [voterId, targetId]) => {
                  const target = game.players.find((p: any) => p.playerId === targetId);
                  if (target) {
                    acc[target.name] = (acc[target.name] || 0) + 1;
                    
                    // Add sheriff bonus
                    const voter = game.players.find((p: any) => p.playerId === voterId);
                    if (voter?.isSheriff) {
                      acc[target.name] += 1;
                    }
                  }
                  return acc;
                }, {} as Record<string, number>)
              ).map(([name, count]) => (
                <div key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span>{count} vote{count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

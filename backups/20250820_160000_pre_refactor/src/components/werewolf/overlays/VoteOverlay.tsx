import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VoteOverlayProps {
  gameState: any;
}

export default function VoteOverlay({ gameState }: VoteOverlayProps) {
  const game = gameState.gameState;
  const alivePlayers = game?.alivePlayers?.filter((p: any) => p.playerId !== gameState.playerId) || [];

  const handleVote = (targetId: string) => {
    gameState.vote(targetId);
  };

  const handleSelectPlayer = (player: any) => {
    gameState.setSelectedPlayer(player);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[60] p-4">
      <Card className="panel max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="font-cinzel text-3xl text-center">Vote to Eliminate</CardTitle>
          <p className="text-lg text-center">
            Choose a player to vote out. You can change your vote until time runs out.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {alivePlayers.map((player: any) => (
              <Button
                key={player.playerId}
                onClick={() => handleSelectPlayer(player)}
                variant={gameState.selectedPlayer?.playerId === player.playerId ? "destructive" : "secondary"}
                className="p-4 h-auto flex flex-col items-center"
              >
                <span className="font-bold">{player.name}</span>
                {player.isSheriff && <span className="text-xs">⭐ Sheriff</span>}
              </Button>
            ))}
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => gameState.selectedPlayer && handleVote(gameState.selectedPlayer.playerId)}
              disabled={!gameState.selectedPlayer}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg"
            >
              Confirm Vote
            </Button>
            <Button
              onClick={() => gameState.setShowVoteOverlay(false)}
              variant="secondary"
              className="text-white font-bold py-3 px-6 rounded-lg"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

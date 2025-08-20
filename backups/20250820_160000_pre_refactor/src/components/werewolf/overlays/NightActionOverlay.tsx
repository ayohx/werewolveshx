import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Check, X } from 'lucide-react';

interface NightActionOverlayProps {
  gameState: any;
}

export default function NightActionOverlay({ gameState }: NightActionOverlayProps) {
  const [killConfirmation, setKillConfirmation] = useState('');
  const [actionType, setActionType] = useState<'kill' | 'save' | 'poison' | 'protect' | 'investigate' | null>(null);
  const game = gameState.gameState;
  const playerRole = gameState.getPlayerRole();
  
  const getActionConfig = () => {
    switch (playerRole) {
      case 'werewolf':
        return {
          title: 'Choose Your Victim',
          description: 'Select a player to eliminate tonight. Type their name exactly to confirm.',
          targets: game?.alivePlayers?.filter((p: any) => p.role !== 'werewolf') || [],
          actionTypes: ['kill'],
          requiresConfirmation: true
        };
      case 'seer':
        const investigationsLeft = game?.seerInvestigationsLeft?.[gameState.playerId] || 0;
        return {
          title: 'Divine a Player',
          description: `Choose a player to learn their role. Investigations remaining: ${investigationsLeft}`,
          targets: investigationsLeft > 0 ? (game?.alivePlayers?.filter((p: any) => p.playerId !== gameState.playerId) || []) : [],
          actionTypes: ['investigate'],
          requiresConfirmation: false
        };
      case 'doctor':
        return {
          title: 'Protect a Player',
          description: 'Choose a player to protect from werewolf attacks. You can save yourself or others.',
          targets: game?.alivePlayers || [],
          actionTypes: ['save'],
          requiresConfirmation: false
        };
      case 'witch':
        return {
          title: 'Use Your Potions',
          description: 'Choose to save or poison a player.',
          targets: game?.alivePlayers || [],
          actionTypes: ['save', 'poison'],
          requiresConfirmation: false
        };
      case 'bodyguard':
        return {
          title: 'Guard a Player',
          description: 'Choose a player to protect. You will die if they are attacked.',
          targets: game?.alivePlayers?.filter((p: any) => p.playerId !== gameState.playerId) || [],
          actionTypes: ['protect'],
          requiresConfirmation: false
        };
      default:
        return {
          title: 'Night Action',
          description: 'Perform your night action.',
          targets: [],
          actionTypes: [],
          requiresConfirmation: false
        };
    }
  };

  const actionConfig = getActionConfig();

  const handleAction = (targetId?: string) => {
    if (playerRole === 'werewolf' && targetId) {
      const target = actionConfig.targets.find((p: any) => p.playerId === targetId);
      if (target && killConfirmation !== target.name) {
        return; // Don't proceed if name confirmation doesn't match
      }
    }
    gameState.performNightAction(targetId, actionType);
  };

  const handleSelectPlayer = (player: any) => {
    gameState.setSelectedPlayer(player);
    setKillConfirmation(''); // Reset confirmation when selecting new player
  };

  const isActionValid = () => {
    if (!gameState.selectedPlayer) return false;
    if (playerRole === 'werewolf') {
      const target = actionConfig.targets.find((p: any) => p.playerId === gameState.selectedPlayer.playerId);
      return target && killConfirmation === target.name;
    }
    return true;
  };

  const renderActionResult = () => {
    if (playerRole !== 'seer' || !gameState.selectedPlayer) return null;

    const target = actionConfig.targets.find((p: any) => p.playerId === gameState.selectedPlayer.playerId);
    if (!target) return null;

    const isWerewolf = target.role === 'werewolf';
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        {isWerewolf ? (
          <Check className="w-6 h-6 text-green-500" />
        ) : (
          <X className="w-6 h-6 text-red-500" />
        )}
        <span className={isWerewolf ? 'text-green-500' : 'text-red-500'}>
          {isWerewolf ? 'Werewolf Found!' : 'Not a Werewolf'}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[60] p-4">
      <Card className="panel max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="font-cinzel text-3xl text-center">{actionConfig.title}</CardTitle>
          <p className="text-lg text-center">{actionConfig.description}</p>
        </CardHeader>
        <CardContent>
          {actionConfig.actionTypes.length > 1 && (
            <div className="flex justify-center gap-4 mb-6">
              {actionConfig.actionTypes.map((type) => (
                <Button
                  key={type}
                  onClick={() => setActionType(type as any)}
                  variant={actionType === type ? "default" : "secondary"}
                  className="capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {actionConfig.targets.map((player: any) => (
              <Button
                key={player.playerId}
                onClick={() => handleSelectPlayer(player)}
                variant={gameState.selectedPlayer?.playerId === player.playerId ? "default" : "secondary"}
                className="p-4 h-auto flex flex-col items-center"
                disabled={!actionType && actionConfig.actionTypes.length > 1}
              >
                <span className="font-bold">{player.name}</span>
                {player.isSheriff && <span className="text-xs">⭐ Sheriff</span>}
                {player.hasShield && <span className="text-xs">🛡️ Shielded</span>}
              </Button>
            ))}
          </div>

          {playerRole === 'werewolf' && gameState.selectedPlayer && (
            <div className="mb-6">
              <Input
                type="text"
                placeholder="Type player name to confirm kill"
                value={killConfirmation}
                onChange={(e) => setKillConfirmation(e.target.value)}
                className="text-center"
              />
            </div>
          )}

          {renderActionResult()}
          
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => handleAction(gameState.selectedPlayer?.playerId)}
              disabled={!isActionValid() || (!actionType && actionConfig.actionTypes.length > 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
            >
              Confirm Action
            </Button>
            <Button
              onClick={() => handleAction()}
              variant="secondary"
              className="text-white font-bold py-3 px-6 rounded-lg"
            >
              Skip Action
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

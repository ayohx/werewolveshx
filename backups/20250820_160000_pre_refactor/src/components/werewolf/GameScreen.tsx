import { useState, useEffect } from 'react';
import PlayerList from './PlayerList';
import Chat from './Chat';
import RoleReveal from './overlays/RoleReveal';
import VoteOverlay from './overlays/VoteOverlay';
import NightActionOverlay from './overlays/NightActionOverlay';
import GameOverOverlay from './overlays/GameOverOverlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from 'next-themes';
import { Shield } from 'lucide-react';

interface GameScreenProps {
  gameState: any;
}

export default function GameScreen({ gameState }: GameScreenProps) {
  const [timer, setTimer] = useState<string>('0:00');
  const { setTheme } = useTheme();
  const game = gameState.gameState;

  useEffect(() => {
    if (!game) return;

    // Set theme based on phase
    if (game.phase === 'night') {
      setTheme('dark');
    } else {
      setTheme('light');
    }

    const interval = setInterval(() => {
      const minutes = Math.floor(game.phaseTimer / 60);
      const seconds = game.phaseTimer % 60;
      setTimer(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.phaseTimer, game?.phase, setTheme]);

  const getPhaseInfo = () => {
    switch (game?.phase) {
      case 'night':
        return {
          title: `Night ${game.nightCount || 1}`,
          subtitle: 'The village sleeps while evil stirs...',
          color: 'text-blue-400',
          bgColor: 'bg-gray-900'
        };
      case 'day':
        return {
          title: `Day ${game.dayCount || 1}`,
          subtitle: 'Discuss and find the werewolves',
          color: 'text-yellow-400',
          bgColor: 'bg-gray-100'
        };
      case 'voting':
        return {
          title: 'Voting Phase',
          subtitle: 'Vote to eliminate a player',
          color: 'text-red-400',
          bgColor: 'bg-gray-100'
        };
      default:
        return {
          title: 'Game Phase',
          subtitle: '',
          color: 'text-gray-400',
          bgColor: 'bg-gray-100'
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  const handleShieldAction = () => {
    gameState.performNightAction(gameState.playerId, 'shield');
  };

  return (
    <>
      {/* Overlays */}
      {gameState.showRoleReveal && <RoleReveal gameState={gameState} />}
      {gameState.showVoteOverlay && <VoteOverlay gameState={gameState} />}
      {gameState.showNightActionOverlay && <NightActionOverlay gameState={gameState} />}
      {gameState.showGameOverOverlay && <GameOverOverlay gameState={gameState} />}

      <div className={`min-h-screen transition-colors duration-500 ${phaseInfo.bgColor}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Players Panel */}
          <div className="lg:col-span-1">
            <PlayerList gameState={gameState} />
          </div>

          {/* Main Game Panel */}
          <div className="lg:col-span-2">
            <Card className={`panel rounded-lg shadow-2xl ${game?.phase === 'night' ? 'bg-gray-900/90' : 'bg-white/90'}`}>
              <CardContent className="p-6 flex flex-col h-full">
                {/* Phase Display */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className={`font-cinzel text-4xl font-bold ${phaseInfo.color}`}>
                      {phaseInfo.title}
                    </h2>
                    <p className="text-gray-400">{phaseInfo.subtitle}</p>
                  </div>
                  <div className={`text-2xl font-bold text-gray-300 bg-gray-900/50 px-4 py-2 rounded-lg ${
                    game?.phaseTimer <= 10 ? 'timer-warning text-red-400 animate-pulse' : ''
                  }`}>
                    {timer}
                  </div>
                </div>

                {/* Chat */}
                <div className="flex-grow">
                  <Chat gameState={gameState} />
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {game?.phase === 'voting' && gameState.canVote() && (
                      <Button
                        onClick={() => gameState.setShowVoteOverlay(true)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg"
                      >
                        Vote
                      </Button>
                    )}
                    
                    {game?.phase === 'night' && (
                      <>
                        {gameState.hasNightAction() && !gameState.hasPerformedNightAction && (
                          <Button
                            onClick={() => gameState.setShowNightActionOverlay(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
                          >
                            Night Action
                          </Button>
                        )}
                        {!gameState.hasUsedShield && (
                          <Button
                            onClick={handleShieldAction}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"
                          >
                            <Shield className="w-4 h-4" />
                            Use Shield
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

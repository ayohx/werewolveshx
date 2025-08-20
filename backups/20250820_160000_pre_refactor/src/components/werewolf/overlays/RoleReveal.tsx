import { Button } from '@/components/ui/button';
import { ROLE_INFO } from '@/lib/gameTypes';
import { useState, useEffect } from 'react';

interface RoleRevealProps {
  gameState: any;
}

export default function RoleReveal({ gameState }: RoleRevealProps) {
  const [countdown, setCountdown] = useState(10);
  const playerRole = gameState.getPlayerRole();
  const game = gameState.gameState;
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          gameState.setShowRoleReveal(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);
  
  if (!playerRole || countdown <= 0) return null;

  const roleInfo = ROLE_INFO[playerRole as keyof typeof ROLE_INFO];
  const werewolfPack = game?.players.filter((p: any) => 
    p.role === 'werewolf' && p.playerId !== gameState.playerId
  );

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4">
      <div className="text-4xl font-bold mb-8 text-yellow-400">
        YOUR ROLE
      </div>
      <h2 className={`font-cinzel text-6xl font-bold mb-4 ${roleInfo.color}`}>
        {roleInfo.name}
      </h2>
      <p className="text-lg text-gray-300 mt-4 max-w-md text-center">
        {roleInfo.description}
      </p>
      
      {playerRole === 'werewolf' && werewolfPack?.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-gray-400">Your fellow werewolves are:</p>
          <p className="text-xl text-white font-bold">
            {werewolfPack.map((p: any) => p.name).join(', ')}
          </p>
        </div>
      )}
      
      <div className="mt-6 text-2xl font-bold text-white">
        {countdown}
      </div>
      
      <p className="text-gray-400 mt-2">
        Memorize your role information
      </p>
      
      <Button
        onClick={() => {
          setCountdown(0);
          gameState.setShowRoleReveal(false);
        }}
        className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg"
      >
        Continue
      </Button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROLE_INFO } from '@/lib/gameTypes';

interface RoleRevealOverlayProps {
  role: string;
  phaseTimer: number;
  gameState: any;
}

export default function RoleRevealOverlay({ role, phaseTimer, gameState }: RoleRevealOverlayProps) {
  const [countdown, setCountdown] = useState(phaseTimer);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const roleInfo = ROLE_INFO[role as keyof typeof ROLE_INFO];
  
  // Show werewolf allies for werewolves
  const werewolfAllies = role === 'werewolf' 
    ? gameState?.alivePlayers?.filter((p: any) => p.role === 'werewolf' && p.playerId !== gameState.playerId) || []
    : [];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
      <Card className="panel w-full max-w-md mx-4 shadow-2xl border-4 border-yellow-600/50">
        <CardHeader className="text-center">
          <CardTitle className="font-cinzel text-3xl font-bold text-yellow-400 mb-2">
            Your Role
          </CardTitle>
          <div className="text-6xl font-bold text-white mb-2">
            {countdown}
          </div>
          <div className="text-sm text-gray-400">
            Memorize your role information
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className={`text-2xl font-bold ${roleInfo?.color || 'text-white'}`}>
            {roleInfo?.name || role.toUpperCase()}
          </div>
          
          <div className="text-gray-300 text-sm leading-relaxed">
            {roleInfo?.description || 'Unknown role'}
          </div>

          {werewolfAllies.length > 0 && (
            <div className="bg-red-900/30 p-3 rounded-lg border border-red-500/30">
              <div className="text-red-400 font-bold mb-2">Your Werewolf Allies:</div>
              <div className="text-white">
                {werewolfAllies.map((ally: any, index: number) => (
                  <div key={ally.playerId} className="font-medium">
                    {ally.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 mt-4">
            This information will disappear when the timer reaches zero
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
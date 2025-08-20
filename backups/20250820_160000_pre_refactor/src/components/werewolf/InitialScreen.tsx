import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface InitialScreenProps {
  gameState: any;
}

export default function InitialScreen({ gameState }: InitialScreenProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');

  const handleCreateGame = () => {
    if (!playerName.trim()) return;
    gameState.setCurrentScreen('settings');
  };

  const handleJoinGame = () => {
    if (!playerName.trim() || !gameCode.trim()) return;
    gameState.joinGame(gameCode, playerName);
  };

  return (
    <div className="text-center">
      <h1 className="font-cinzel text-6xl md:text-8xl font-bold mb-4 text-red-500 relative">
        <span className="absolute inset-0 text-white blur-sm opacity-80 transform scale-105">WEREWOLF</span>
        <span className="absolute inset-0 text-yellow-300 blur-md opacity-40 transform scale-110">WEREWOLF</span>
        <span className="relative bg-gradient-to-b from-red-400 to-red-600 bg-clip-text text-transparent drop-shadow-2xl">WEREWOLF</span>
      </h1>
      <p className="text-gray-300 mb-12 text-lg font-medium">
        Where pointing fingers is totally normal and trust issues are a feature, not a bug!
      </p>
      
      <div className="space-y-4 md:space-y-0 md:space-x-4 md:flex md:justify-center">
        <Button
          onClick={() => {
            setShowJoinForm(false);
            setShowCreateForm(true);
          }}
          className="btn-primary w-full md:w-auto bg-red-800 hover:bg-red-900 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all transform hover:scale-105 border-2 border-amber-700 hover:border-amber-600"
        >
          Create New Game
        </Button>
        <Button
          onClick={() => {
            setShowCreateForm(false);
            setShowJoinForm(true);
          }}
          className="btn-secondary w-full md:w-auto bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-all transform hover:scale-105 border-2 border-amber-800 hover:border-amber-700"
        >
          Join Existing Game
        </Button>
      </div>

      {showJoinForm && (
        <Card className="mt-8 max-w-sm mx-auto panel">
          <CardContent className="pt-6 space-y-4">
            <Input
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              placeholder="Enter Game Code"
              className="w-full bg-gray-800 border border-gray-600 text-center text-white placeholder-gray-500"
              maxLength={6}
            />
            <Input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter Your Name"
              className="w-full bg-gray-800 border border-gray-600 text-center text-white placeholder-gray-500"
              maxLength={20}
            />
            <Button
              onClick={handleJoinGame}
              disabled={!playerName.trim() || !gameCode.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
            >
              Enter Lobby
            </Button>
          </CardContent>
        </Card>
      )}

      {showCreateForm && (
        <Card className="mt-8 max-w-sm mx-auto panel">
          <CardContent className="pt-6 space-y-4">
            <Input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter Your Name"
              className="w-full bg-gray-800 border border-gray-600 text-center text-white placeholder-gray-500"
              maxLength={20}
            />
            <Button
              onClick={handleCreateGame}
              disabled={!playerName.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
            >
              Set Up Game
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

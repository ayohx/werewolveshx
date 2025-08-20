import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { Moon, Sun } from 'lucide-react';

interface ChatProps {
  gameState: any;
}

export default function Chat({ gameState }: ChatProps) {
  const [message, setMessage] = useState('');
  const chatLogRef = useRef<HTMLDivElement>(null);
  const game = gameState.gameState;
  const playerRole = gameState.getPlayerRole();

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [game?.chatMessages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    gameState.sendChatMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const getMessageStyle = (type: string, isNight: boolean) => {
    switch (type) {
      case 'system':
        return 'bg-blue-900/30 text-blue-200';
      case 'death':
        return 'bg-red-900/30 text-red-200';
      case 'elimination':
        return 'bg-purple-900/30 text-purple-200';
      case 'werewolf':
        return 'bg-red-800/30 text-red-200';
      case 'scrambled':
        return 'bg-gray-800/30 text-gray-300 italic';
      default:
        return isNight ? 'bg-gray-800/30 text-gray-300' : 'bg-gray-800/30';
    }
  };

  const shouldShowMessage = (msg: any) => {
    if (msg.type === 'werewolf') {
      return playerRole === 'werewolf' || playerRole === 'minion';
    }
    return true;
  };

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'werewolf':
        return <Moon className="w-4 h-4 text-red-400" />;
      case 'scrambled':
        return <Moon className="w-4 h-4 text-gray-400" />;
      case 'player':
        return game?.phase === 'night' ? 
          <Moon className="w-4 h-4 text-gray-400" /> : 
          <Sun className="w-4 h-4 text-yellow-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Log */}
      <div
        ref={chatLogRef}
        className="flex-grow bg-black/30 p-3 rounded-lg overflow-y-auto h-48 md:h-64 mb-4 border border-gray-700"
      >
        {game?.chatMessages?.filter(shouldShowMessage).map((msg: any, index: number) => (
          <div
            key={index}
            className={`chat-message mb-2 p-2 rounded-lg animate-in fade-in duration-300 ${getMessageStyle(msg.type, game?.phase === 'night')}`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getChatIcon(msg.type)}
                  <span className="font-bold text-sm">{msg.playerName}</span>
                </div>
                <div className="mt-1 break-words">{msg.message}</div>
              </div>
              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Chat Input */}
      {gameState.canChat() && (
        <div className="flex space-x-2">
          <Input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              game?.phase === 'night' && playerRole !== 'werewolf'
                ? "Your message will be scrambled..."
                : "Type your message..."
            }
            className="flex-1 bg-gray-800 border border-gray-600 text-white placeholder-gray-500"
            maxLength={200}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className={`text-white font-bold py-2 px-4 rounded-lg ${
              game?.phase === 'night' && playerRole === 'werewolf'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {!gameState.canChat() && (
        <div className="text-center text-gray-500 py-2">
          {game?.phase === 'night' ? 'You cannot speak during the night' : 'Dead players cannot speak'}
        </div>
      )}
    </div>
  );
}

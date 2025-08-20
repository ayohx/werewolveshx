import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { GameSettings as GameSettingsType } from '@/lib/gameTypes';

interface GameSettingsProps {
  gameState: any;
}

export default function GameSettings({ gameState }: GameSettingsProps) {
  const [settings, setSettings] = useState<GameSettingsType>({
    werewolves: 1,
    seer: true,
    doctor: true,
    shield: true,
    minion: false,
    jester: false,
    hunter: false,
    witch: false,
    bodyguard: false,
    sheriff: false,
    seerInvestigations: undefined // Will use default (30% of werewolves, min 3)
  });

  const handleCreateLobby = () => {
    gameState.createGame(gameState.playerName, settings);
  };

  const settingsConfig = [
    {
      key: 'seer',
      title: 'Include Seer',
      description: 'Can check a player\'s role.',
      type: 'switch'
    },
    {
      key: 'doctor',
      title: 'Include Doctor', 
      description: 'Protects one player each night, including themselves.',
      type: 'switch'
    },
    {
      key: 'shield',
      title: 'Universal Shield',
      description: 'One-time night protection for all.',
      type: 'switch'
    },
    {
      key: 'minion',
      title: 'Include Minion',
      description: 'A villager on the wolves\' team.',
      type: 'switch'
    },
    {
      key: 'jester',
      title: 'Include Jester',
      description: 'Wins if voted out by villagers.',
      type: 'switch'
    },
    {
      key: 'hunter',
      title: 'Include Hunter',
      description: 'When killed, takes someone with them.',
      type: 'switch'
    },
    {
      key: 'witch',
      title: 'Include Witch',
      description: 'Has one poison and one save potion.',
      type: 'switch'
    },
    {
      key: 'bodyguard',
      title: 'Include Bodyguard',
      description: 'Protects a player, but dies if they are attacked.',
      type: 'switch'
    },
    {
      key: 'sheriff',
      title: 'Enable Sheriff',
      description: 'One random (non-wolf) player is Sheriff. Their vote counts as two.',
      type: 'switch'
    }
  ];

  return (
    <Card className="panel rounded-lg shadow-2xl">
      <CardHeader>
        <CardTitle className="font-cinzel text-4xl font-bold text-center">
          Game Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Werewolf Count */}
          <div className="bg-gray-800/50 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg">Number of Werewolves</h3>
              <p className="text-sm text-gray-400 mt-1">Default is ~30% of players.</p>
            </div>
            <Input
              type="number"
              value={settings.werewolves}
              onChange={(e) => setSettings(prev => ({ ...prev, werewolves: Math.max(1, parseInt(e.target.value) || 1) }))}
              min={1}
              className="w-24 mt-3 bg-gray-900 border border-gray-600 text-center text-white self-end"
            />
          </div>

          {/* Seer Investigations */}
          <div className="bg-gray-800/50 p-4 rounded-lg flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg">Seer Investigations</h3>
              <p className="text-sm text-gray-400 mt-1">Default: 30% of werewolves (min 3). Set custom amount or leave blank for default.</p>
            </div>
            <Input
              type="number"
              value={settings.seerInvestigations || ''}
              onChange={(e) => {
                const value = e.target.value;
                setSettings(prev => ({ 
                  ...prev, 
                  seerInvestigations: value === '' ? undefined : Math.max(1, Math.min(20, parseInt(value) || 1))
                }));
              }}
              min={1}
              max={20}
              placeholder="Auto"
              className="w-24 mt-3 bg-gray-900 border border-gray-600 text-center text-white self-end"
            />
          </div>

          {/* Other Settings */}
          {settingsConfig.map((config) => (
            <div key={config.key} className="bg-gray-800/50 p-4 rounded-lg flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{config.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{config.description}</p>
              </div>
              <Switch
                checked={settings[config.key as keyof GameSettingsType] as boolean}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, [config.key]: checked }))
                }
                className="flex-shrink-0 ml-4"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-8">
          <Button
            onClick={() => gameState.setCurrentScreen('initial')}
            className="btn-cancel bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg"
          >
            Back
          </Button>
          <Button
            onClick={handleCreateLobby}
            className="bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg"
          >
            Confirm & Create Lobby
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

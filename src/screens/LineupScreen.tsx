import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTeams } from '../context/TeamContext';
import { ArrowLeft, User } from 'lucide-react';
import { Player } from '../types';

export default function LineupScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { teams, updateLineup } = useTeams();
  
  const team = teams.find(t => t.id === id);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  if (!team) return null;

  const positions = [
    { id: 'pos4', label: '4', name: '前排左 (LF)' },
    { id: 'pos3', label: '3', name: '前排中 (CF)' },
    { id: 'pos2', label: '2', name: '前排右 (RF)' },
    { id: 'pos5', label: '5', name: '後排左 (LB)' },
    { id: 'pos6', label: '6', name: '後排中 (CB)' },
    { id: 'pos1', label: '1', name: '後排右 (RB)' },
  ];

  const getPlayerInPos = (posKey: string) => {
    const playerId = team.lineup?.[posKey as keyof typeof team.lineup];
    return team.players.find(p => p.id === playerId);
  };

  const handlePlayerSelect = (player: Player) => {
    if (selectedPosition) {
      updateLineup(team.id, selectedPosition, player.id);
      setSelectedPosition(null);
    }
  };

  const handleClearPosition = (posKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateLineup(team.id, posKey, undefined);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/team/${team.id}`)} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{team.name} - 先發陣容</h1>
            <p className="text-xs text-gray-500">點擊場上位置，再選擇球員</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Court Area */}
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-[400px] aspect-[9/9] bg-orange-100 border-4 border-orange-300 rounded-lg shadow-inner overflow-hidden">
            {/* Net */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400/50 z-10"></div>
            
            {/* Attack Line (3m line) - Roughly 1/3 from top */}
            <div className="absolute top-[33.33%] left-0 right-0 h-1 bg-white/80 z-0"></div>

            {/* Grid for positions */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1 p-2">
              {/* Front Row: 4, 3, 2 */}
              {positions.slice(0, 3).map((pos) => {
                const player = getPlayerInPos(pos.id);
                const isSelected = selectedPosition === pos.id;
                
                return (
                  <div 
                    key={pos.id}
                    onClick={() => setSelectedPosition(pos.id)}
                    className={`
                      relative flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer
                      ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-orange-200 bg-orange-50/80 hover:bg-orange-100'}
                    `}
                  >
                    <span className="absolute top-1 left-2 text-xs font-bold text-orange-300">{pos.label}</span>
                    {player ? (
                      <>
                        <span className="text-2xl font-bold text-gray-800">{player.number}</span>
                        <span className="text-xs font-medium text-gray-600 truncate max-w-[90%]">{player.name}</span>
                        <button 
                          onClick={(e) => handleClearPosition(pos.id, e)}
                          className="absolute -top-2 -right-2 rounded-full bg-red-100 p-1 text-red-600 opacity-0 hover:bg-red-200 group-hover:opacity-100 transition-opacity"
                        >
                          <User size={12} />
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">空缺</span>
                    )}
                  </div>
                );
              })}

              {/* Back Row: 5, 6, 1 */}
              {positions.slice(3, 6).map((pos) => {
                const player = getPlayerInPos(pos.id);
                const isSelected = selectedPosition === pos.id;
                
                return (
                  <div 
                    key={pos.id}
                    onClick={() => setSelectedPosition(pos.id)}
                    className={`
                      relative flex flex-col items-center justify-center rounded-lg border-2 transition-all cursor-pointer
                      ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-orange-200 bg-orange-50/80 hover:bg-orange-100'}
                    `}
                  >
                    <span className="absolute top-1 left-2 text-xs font-bold text-orange-300">{pos.label}</span>
                    {player ? (
                      <>
                        <span className="text-2xl font-bold text-gray-800">{player.number}</span>
                        <span className="text-xs font-medium text-gray-600 truncate max-w-[90%]">{player.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">空缺</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Libero Section */}
          <div className="mt-4 w-full max-w-[400px]">
            <div 
              onClick={() => setSelectedPosition('libero')}
              className={`
                flex items-center justify-between rounded-lg border-2 px-4 py-3 cursor-pointer transition-all
                ${selectedPosition === 'libero' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white hover:border-yellow-300'}
              `}
            >
              <span className="font-bold text-gray-700">自由球員 (L)</span>
              {getPlayerInPos('libero') ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{getPlayerInPos('libero')?.number}</span>
                  <span className="text-sm text-gray-600">{getPlayerInPos('libero')?.name}</span>
                  <button 
                    onClick={(e) => handleClearPosition('libero', e)}
                    className="ml-2 text-xs text-red-500 hover:underline"
                  >
                    清除
                  </button>
                </div>
              ) : (
                <span className="text-sm text-gray-400">點擊選擇</span>
              )}
            </div>
          </div>
        </div>

        {/* Player Selection Panel */}
        <div className={`
          flex-1 bg-white border-t border-gray-200 lg:border-t-0 lg:border-l lg:max-w-xs
          ${selectedPosition ? 'block' : 'hidden lg:block'}
        `}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">
              {selectedPosition ? '選擇球員' : '球員名單'}
            </h3>
            {selectedPosition && (
              <p className="text-xs text-blue-600">
                正在為 {positions.find(p => p.id === selectedPosition)?.name || '自由球員'} 選擇
              </p>
            )}
          </div>
          <div className="overflow-y-auto max-h-[40vh] lg:max-h-[calc(100vh-120px)]">
            {team.players.map(player => {
              // Check if player is already assigned somewhere else
              const assignedPos = Object.entries(team.lineup || {}).find(([_, pid]) => pid === player.id)?.[0];
              const isAssigned = !!assignedPos;
              const isCurrentPos = assignedPos === selectedPosition;

              return (
                <button
                  key={player.id}
                  onClick={() => handlePlayerSelect(player)}
                  disabled={!selectedPosition}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 border-b border-gray-50 text-left transition-colors
                    ${isCurrentPos ? 'bg-blue-50' : ''}
                    ${!selectedPosition ? 'opacity-50 cursor-default' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className={`
                      flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold
                      ${player.position === 'L' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}
                    `}>
                      {player.number}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{player.name}</p>
                      <p className="text-xs text-gray-500">{player.position}</p>
                    </div>
                  </div>
                  {isAssigned && !isCurrentPos && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">
                      已上場
                    </span>
                  )}
                  {isCurrentPos && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                      目前位置
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

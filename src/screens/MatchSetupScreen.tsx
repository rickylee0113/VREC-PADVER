import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTeams } from '../context/TeamContext';
import { ArrowLeft, ArrowRight, RefreshCw, Database, Save, Play, Tablet, Monitor, X, User } from 'lucide-react';
import { Position } from '../types';

// Positions on the court
const COURT_POSITIONS = [
  { id: 'pos4', label: '4', name: '前排左' },
  { id: 'pos3', label: '3', name: '前排中' },
  { id: 'pos2', label: '2', name: '前排右' },
  { id: 'pos5', label: '5', name: '後排左' },
  { id: 'pos6', label: '6', name: '後排中' },
  { id: 'pos1', label: '1', name: '後排右' },
];

const ROLES: { value: Position; label: string }[] = [
  { value: 'OH', label: '大砲 (OH)' },
  { value: 'MB', label: '快攻 (MB)' },
  { value: 'OP', label: '舉對 (OP)' },
  { value: 'S', label: '舉球 (S)' },
  { value: 'L', label: '自由 (L)' },
  { value: 'Unknown', label: '未指定' },
];

// Layout configurations for 2 columns x 3 rows
// Left Team (Home): Back Row (5,6,1) on Left Col, Front Row (4,3,2) on Right Col
const HOME_LAYOUT = [
  ['pos5', 'pos4'], // Top Row
  ['pos6', 'pos3'], // Middle Row
  ['pos1', 'pos2']  // Bottom Row
];

// Right Team (Away): Front Row (2,3,4) on Left Col, Back Row (1,6,5) on Right Col
const AWAY_LAYOUT = [
  ['pos2', 'pos1'], // Top Row
  ['pos3', 'pos6'], // Middle Row
  ['pos4', 'pos5']  // Bottom Row
];

export default function MatchSetupScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { teams, updateLineup, updateTeam } = useTeams();
  const [isTabletMode, setIsTabletMode] = useState(false);
  const [activeSlot, setActiveSlot] = useState<{ teamId: string, posId: string } | null>(null);
  
  const homeTeamId = searchParams.get('home');
  const awayTeamId = searchParams.get('away');
  
  const homeTeam = teams.find(t => t.id === homeTeamId);
  const awayTeam = teams.find(t => t.id === awayTeamId);

  const handlePlayerSelect = (playerId: string) => {
    if (activeSlot) {
      updateLineup(activeSlot.teamId, activeSlot.posId, playerId);
      setActiveSlot(null);
    }
  };

  const handleStartMatch = () => {
    navigate(`/match?home=${homeTeamId}&away=${awayTeamId}`);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const fillRandomLineup = () => {
    // Helper to fill random players
    [homeTeam, awayTeam].forEach(team => {
      if (!team) return;
      
      const newLineup: Record<string, string> = {};
      const players = [...team.players];
      
      // 1. Find Libero and assign to 'libero' slot
      const libero = players.find(p => p.position === 'L');
      if (libero) {
        newLineup['libero'] = libero.id;
      }

      // 2. Assign other players to court positions
      // Filter out the assigned libero so we don't put them on court
      const courtPlayers = players.filter(p => p.id !== libero?.id);
      
      // Shuffle remaining players
      courtPlayers.sort(() => Math.random() - 0.5);

      COURT_POSITIONS.forEach((pos, index) => {
        if (index < courtPlayers.length) {
          newLineup[pos.id] = courtPlayers[index].id;
        }
      });
      
      updateTeam(team.id, { lineup: newLineup });
    });
  };

  if (!homeTeam || !awayTeam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">找不到球隊資料</p>
          <button onClick={() => navigate('/')} className="text-blue-600 hover:underline">返回首頁</button>
        </div>
      </div>
    );
  }

  const renderPlayerSlot = (team: typeof homeTeam, posId: string, isLibero = false) => {
    if (!team) return null;
    const playerId = team.lineup?.[posId as keyof typeof team.lineup];
    const player = team.players.find(p => p.id === playerId);
    const posLabel = isLibero ? 'L' : COURT_POSITIONS.find(p => p.id === posId)?.label;
    const isHome = team.id === homeTeamId;

    // Colors based on team (Red for Home, Blue for Away)
    const baseColorClass = isLibero 
      ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100' 
      : isHome 
        ? 'border-red-200 bg-red-50 hover:bg-red-100' 
        : 'border-blue-200 bg-blue-50 hover:bg-blue-100';
    
    const numberColorClass = isLibero ? 'text-yellow-200/50' : isHome ? 'text-red-200/50' : 'text-blue-200/50';

    return (
      <div 
        key={posId} 
        onClick={() => setActiveSlot({ teamId: team.id, posId })}
        className={`relative flex flex-col items-center justify-center p-2 rounded-lg border shadow-sm h-full min-h-[100px] transition-all cursor-pointer active:scale-95 ${baseColorClass}`}
      >
        {/* Faint Position Number */}
        {!isLibero && (
          <div className={`absolute top-1 left-2 text-2xl font-bold pointer-events-none select-none ${numberColorClass}`}>
            {posLabel}
          </div>
        )}
        
        {/* Player Number and Name Row */}
        <div className="relative z-10 mb-2 flex items-center gap-2 w-full justify-center px-2">
           {/* Number Box */}
           <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100 shrink-0">
             {player ? (
               <span className="text-2xl font-bold text-gray-800">{player.number}</span>
             ) : (
               <User className="text-gray-300" size={24} />
             )}
           </div>
           
           {/* Name Box */}
           <div className="h-14 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100 px-2 grow min-w-0">
             <span className="text-lg font-bold text-gray-900 truncate">
               {player ? player.name : '點擊選擇'}
             </span>
           </div>
        </div>

        {/* Role Display */}
        <div className="w-full relative z-10" onClick={(e) => e.stopPropagation()}>
           {player ? (
             <select
               value={player.position}
               onChange={(e) => {
                 const newRole = e.target.value as Position;
                 const updatedPlayers = team.players.map(p => 
                   p.id === player.id ? { ...p, position: newRole } : p
                 );
                 updateTeam(team.id, { players: updatedPlayers });
               }}
               className="w-full text-lg font-bold text-gray-700 bg-white/80 rounded-lg px-2 py-2 text-center border-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
               style={{ textAlignLast: 'center' }}
             >
               {ROLES.map(role => (
                 <option key={role.value} value={role.value}>{role.label}</option>
               ))}
             </select>
           ) : (
             <div className="bg-white/60 rounded-lg px-2 py-2 text-center h-[44px] flex items-center justify-center">
               <span className="text-lg font-medium text-gray-400">-</span>
             </div>
           )}
        </div>
      </div>
    );
  };

  const renderCourtSide = (team: typeof homeTeam, isHome: boolean) => {
    if (!team) return null;
    const layout = isHome ? HOME_LAYOUT : AWAY_LAYOUT;
    const borderColor = isHome ? 'border-red-200' : 'border-blue-200';
    const bgColor = isHome ? 'bg-red-100/30' : 'bg-blue-100/30';
    const textColor = isHome ? 'text-red-800' : 'text-blue-800';

    return (
      <div className={`flex-1 p-4 ${bgColor} rounded-xl border-2 ${borderColor}`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`text-lg font-bold ${textColor}`}>
            {isHome ? '主隊' : '客隊'}: {team.name}
          </h2>
          <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-gray-200">
            {team.players.length} 人
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 aspect-[4/3]">
           {layout.map((row, rowIndex) => (
             <React.Fragment key={rowIndex}>
               {row.map(posId => (
                 <div key={posId} className="h-full">
                   {renderPlayerSlot(team, posId)}
                 </div>
               ))}
             </React.Fragment>
           ))}
        </div>

        {/* Libero */}
        <div className="mt-2 pt-2 border-t border-gray-200/50">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sm text-gray-500 w-12">自由</span>
            <div className="flex-1">
               {renderPlayerSlot(team, 'libero', true)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Player Selection Modal
  const renderPlayerSelectModal = () => {
    if (!activeSlot) return null;
    
    const team = activeSlot.teamId === homeTeamId ? homeTeam : awayTeam;
    if (!team) return null;

    const currentPosLabel = activeSlot.posId === 'libero' 
      ? '自由球員 (L)' 
      : COURT_POSITIONS.find(p => p.id === activeSlot.posId)?.name || activeSlot.posId;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">選擇球員</h3>
              <p className="text-sm text-gray-500">
                {team.name} - {currentPosLabel}
              </p>
            </div>
            <button 
              onClick={() => setActiveSlot(null)}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="overflow-y-auto p-2">
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => handlePlayerSelect('')} // Clear selection
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-gray-200">
                  <X size={20} />
                </div>
                <div>
                  <div className="font-bold text-gray-700">清空位置</div>
                  <div className="text-xs text-gray-400">移除此位置的球員</div>
                </div>
              </button>

              {team.players.map(player => {
                // Check if player is already assigned elsewhere (optional visual cue)
                const assignedPos = Object.entries(team.lineup || {}).find(([_, pid]) => pid === player.id)?.[0];
                const isAssigned = !!assignedPos && assignedPos !== activeSlot.posId;
                
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                      isAssigned 
                        ? 'bg-gray-50 border-gray-100 opacity-75' 
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <button 
                      className="flex items-center gap-3 flex-1 text-left"
                      onClick={() => handlePlayerSelect(player.id)}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        team.id === homeTeamId ? 'bg-red-500' : 'bg-blue-500'
                      }`}>
                        {player.number}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-gray-900">{player.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          {isAssigned && (
                            <span className="text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded text-[10px]">
                              已在場上
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {/* Role Selector inside Modal */}
                    <select
                      value={player.position}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const newRole = e.target.value as Position;
                        const updatedPlayers = team.players.map(p => 
                          p.id === player.id ? { ...p, position: newRole } : p
                        );
                        updateTeam(team.id, { players: updatedPlayers });
                      }}
                      className="text-xs border-gray-200 rounded bg-gray-50 py-1 px-2 focus:ring-1 focus:ring-blue-500"
                    >
                      {ROLES.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isLineupComplete = () => {
    if (!homeTeam || !awayTeam) return false;
    
    const requiredPositions = ['pos1', 'pos2', 'pos3', 'pos4', 'pos5', 'pos6'];
    
    const checkTeam = (team: typeof homeTeam) => {
      return requiredPositions.every(pos => {
        const playerId = team.lineup?.[pos as keyof typeof team.lineup];
        if (!playerId) return false;
        const player = team.players.find(p => p.id === playerId);
        return player && player.position !== 'Unknown';
      });
    };

    return checkTeam(homeTeam) && checkTeam(awayTeam);
  };

  const isReady = isLineupComplete();

  return (
    <div className={`min-h-screen bg-gray-100 flex flex-col transition-colors duration-300 ${isTabletMode ? 'items-center justify-center p-4 bg-gray-900' : ''}`}>
      <div className={`flex flex-col bg-gray-100 w-full h-full transition-all duration-300 ${isTabletMode ? 'max-w-[1024px] aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-8 border-gray-800' : 'min-h-screen'}`}>
        {/* Header */}
        <header className="bg-white px-4 py-3 shadow-sm flex items-center justify-between shrink-0 z-20 relative">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-lg font-bold text-gray-900">比賽陣容設定</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleFullScreen}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="切換全螢幕"
            >
              <Monitor size={16} />
              <span className="hidden sm:inline">全螢幕</span>
            </button>
            <button
              onClick={() => setIsTabletMode(!isTabletMode)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              title={isTabletMode ? "切換回桌面模式" : "模擬平板模式 (橫向)"}
            >
              <Tablet size={16} className={isTabletMode ? "rotate-90" : ""} />
              <span className="hidden sm:inline">{isTabletMode ? '桌面模式' : '平板模擬'}</span>
            </button>
            <button
              onClick={fillRandomLineup}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
            >
              <Database size={16} />
              <span className="hidden sm:inline">測試資料</span>
            </button>
            <button
              onClick={handleStartMatch}
              disabled={!isReady}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all ${
                isReady 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse shadow-red-200' 
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <span>開始比賽</span>
              <Play size={16} fill="currentColor" />
            </button>
          </div>
        </header>

        {/* Main Content - Horizontal Court Layout */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 h-full items-stretch">
            {/* Home Team Side */}
            {renderCourtSide(homeTeam, true)}

            {/* Net / Divider */}
            <div className="hidden lg:flex flex-col items-center justify-center w-8 shrink-0">
              <div className="h-full w-1 bg-gray-800 relative shadow-sm">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white px-1 py-6 rounded-full text-xs font-bold writing-vertical tracking-widest border-2 border-white">
                  NET
                </div>
              </div>
            </div>

            {/* Away Team Side */}
            {renderCourtSide(awayTeam, false)}
          </div>
        </div>
      </div>

      {/* Player Select Modal */}
      {renderPlayerSelectModal()}
    </div>
  );
}

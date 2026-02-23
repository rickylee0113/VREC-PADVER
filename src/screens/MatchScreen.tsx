import React, { useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTeams } from '../context/TeamContext';
import { ArrowLeft, RotateCcw, Upload, Minus, Save, FileText, BarChart2, Download, X } from 'lucide-react';

// Positions for vertical court layout
const POSITIONS = {
  // Away Team (Top)
  away: {
    row1: ['pos2', 'pos3', 'pos4'], // Net (Right to Left from our view)
    row2: ['pos1', 'pos6', 'pos5'], // Back (Right to Left from our view)
  },
  // Home Team (Bottom)
  home: {
    row1: ['pos4', 'pos3', 'pos2'], // Net
    row2: ['pos5', 'pos6', 'pos1'], // Back
  }
};

const ROLE_MAP: Record<string, string> = {
  'OH': '大砲',
  'MB': '快攻',
  'OP': '舉對',
  'S': '舉球',
  'L': '自由',
  'DS': '防守',
  'Unknown': '未知'
};

interface MatchRecord {
  id: string;
  timestamp: number;
  teamId: string;
  playerId: string;
  playerName: string;
  playerNumber: string;
  action: string;
  quality?: string;
  result: 'SCORE' | 'FAULT' | 'CONTINUE';
  trajectory: { start: {x: number, y: number}, end: {x: number, y: number} | null } | null;
  scoreSnapshot: { home: number, away: number };
}

export default function MatchScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { teams, rotateLineup, swapLibero, clearMatchData } = useTeams();
  
  const homeTeamId = searchParams.get('home');
  const awayTeamId = searchParams.get('away');
  
  const homeTeam = teams.find(t => t.id === homeTeamId);
  const awayTeam = teams.find(t => t.id === awayTeamId);

  // Score State
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeSetScore, setHomeSetScore] = useState(0);
  const [awaySetScore, setAwaySetScore] = useState(0);
  
  // Track serving team to know when to rotate
  const [servingTeamId, setServingTeamId] = useState<string | null>(null);

  // Video State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  // Player Action State
  const [selectedPlayer, setSelectedPlayer] = useState<{id: string, name: string, number: string, teamId: string, positionId: string} | null>(null);
  const [actionStep, setActionStep] = useState<'MAIN' | 'SERVE_SUB' | 'SET_SUB' | 'ATTACK_SUB'>('MAIN');
  const [courtMode, setCourtMode] = useState<'VIEW' | 'PLACEMENT'>('VIEW');
  const [trajectory, setTrajectory] = useState<{start: {x: number, y: number}, end: {x: number, y: number} | null} | null>(null);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [quality, setQuality] = useState<string | null>(null);

  // History & Stats State
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MatchRecord | null>(null);
  const [statsTab, setStatsTab] = useState<'SUMMARY' | 'TRAJECTORY'>('SUMMARY');
  const [trajectoryFilter, setTrajectoryFilter] = useState<'ALL' | 'SERVE' | 'ATTACK'>('ALL');
  const [statsPlayerFilter, setStatsPlayerFilter] = useState<string | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Rotation Logs State
  const [rotationLogs, setRotationLogs] = useState<{id: string, message: string}[]>([]);

  const handleBack = () => {
    setConfirmModal({
      isOpen: true,
      title: '返回設定',
      message: '返回設定將會清空目前的比賽紀錄，確定要返回嗎？',
      onConfirm: () => {
        clearMatchData();
        navigate(-1);
      }
    });
  };

  const handleNewMatch = () => {
    setConfirmModal({
      isOpen: true,
      title: '開新比賽',
      message: '確定要結束目前比賽並開始新比賽嗎？所有資料將被清空。',
      onConfirm: () => {
        clearMatchData();
        navigate('/');
      }
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  const handleRotate = (teamId: string) => {
    const logs = rotateLineup(teamId);
    if (logs && logs.length > 0) {
      const newLogs = logs.map(msg => ({ id: Date.now().toString() + Math.random(), message: msg }));
      setRotationLogs(prev => [...newLogs, ...prev].slice(0, 5)); // Keep last 5
      
      // Auto clear after 2.5 seconds
      setTimeout(() => {
        setRotationLogs(prev => prev.filter(l => !newLogs.find(nl => nl.id === l.id)));
      }, 2500);
    }
  };

  const getPlayerCoordinates = (teamId: string, positionId: string) => {
    const isHome = teamId === homeTeamId;
    
    // Default coordinates
    let x = 50;
    let y = 50;

    if (isHome) {
      // Home (Bottom)
      switch (positionId) {
        case 'pos4': x = 20; y = 60; break; // Front Left
        case 'pos3': x = 50; y = 60; break; // Front Center
        case 'pos2': x = 80; y = 60; break; // Front Right
        case 'pos5': x = 20; y = 85; break; // Back Left
        case 'pos6': x = 50; y = 85; break; // Back Center
        case 'pos1': x = 80; y = 85; break; // Back Right
        case 'libero': x = 10; y = 90; break; // Libero (Bottom Left)
      }
    } else {
      // Away (Top) - Mirrored horizontally for screen view (Left is Screen Right)
      switch (positionId) {
        case 'pos4': x = 80; y = 40; break; // Front Left (Screen Right)
        case 'pos3': x = 50; y = 40; break; // Front Center
        case 'pos2': x = 20; y = 40; break; // Front Right (Screen Left)
        case 'pos5': x = 80; y = 15; break; // Back Left (Screen Right)
        case 'pos6': x = 50; y = 15; break; // Back Center
        case 'pos1': x = 20; y = 15; break; // Back Right (Screen Left)
        case 'libero': x = 10; y = 10; break; // Libero (Top Left)
      }
    }
    
    return { x, y };
  };

  const getActionCoordinates = (teamId: string, actionStep: string, actionName: string) => {
    const isHome = teamId === homeTeamId;

    // Serve: Pos 1 area behind baseline
    if (['發球', '強發', '飄球'].includes(actionName) || actionStep === 'SERVE_SUB') {
       return isHome ? { x: 90, y: 98 } : { x: 10, y: 2 };
    }
    
    // Attack: Pos 4 area
    if (['攻擊', 'A快', 'B快', 'C快', '長攻', '後排', '時間差', '打手', '吊球', '背飛'].includes(actionName) || actionStep === 'ATTACK_SUB') {
       return isHome ? { x: 20, y: 60 } : { x: 80, y: 40 };
    }

    // Set: Pos 3 area near net
    if (['舉球', '二攻', '背長'].includes(actionName) || actionStep === 'SET_SUB') {
       return isHome ? { x: 50, y: 60 } : { x: 50, y: 40 };
    }

    // Default: Center of team side
    return isHome ? { x: 50, y: 75 } : { x: 50, y: 25 };
  };

  const handleAction = (action: string) => {
    console.log(`Player ${selectedPlayer?.name} performed ${action}`);
    setCurrentAction(action);
    
    // Transition to Placement Mode
    if (selectedPlayer) {
      const startCoords = getActionCoordinates(selectedPlayer.teamId, actionStep, action);
      setTrajectory({ start: startCoords, end: null });
      setCourtMode('PLACEMENT');
    }
    
    setActionStep('MAIN');
  };

  const handlePlacementComplete = (result: 'SCORE' | 'FAULT' | 'CONTINUE') => {
    let newHomeScore = homeScore;
    let newAwayScore = awayScore;

    // 1. Update Score
    if (result === 'SCORE') {
      if (selectedPlayer?.teamId === homeTeamId) {
        newHomeScore++;
        setHomeScore(newHomeScore);
      } else {
        newAwayScore++;
        setAwayScore(newAwayScore);
      }
    } else if (result === 'FAULT') {
      if (selectedPlayer?.teamId === homeTeamId) {
        newAwayScore++;
        setAwayScore(newAwayScore);
      } else {
        newHomeScore++;
        setHomeScore(newHomeScore);
      }
    }

    // 2. Create Record
    if (selectedPlayer) {
      const newRecord: MatchRecord = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        teamId: selectedPlayer.teamId,
        playerId: selectedPlayer.id,
        playerName: selectedPlayer.name,
        playerNumber: selectedPlayer.number,
        action: currentAction,
        quality: quality || undefined,
        result,
        trajectory: trajectory ? { ...trajectory } : null,
        scoreSnapshot: { home: newHomeScore, away: newAwayScore }
      };
      setHistory(prev => [newRecord, ...prev]);
    }

    // 4. Handle Rotation & Serve
    let winnerId = '';
    if (result === 'SCORE') {
      winnerId = selectedPlayer.teamId;
    } else if (result === 'FAULT') {
      winnerId = selectedPlayer.teamId === homeTeamId ? awayTeamId! : homeTeamId!;
      
      // Special Rule: If MB serves and FAULTS, swap with Libero immediately (Pos 1)
      if (selectedPlayer && 
          (currentAction === '發球' || currentAction === '強發' || currentAction === '飄球') &&
          selectedPlayer.positionId === 'pos1') {
            
        // Check if player is MB
        // We need to find the player object to check position, or use selectedPlayer info if it has it.
        // selectedPlayer has {id, name, number, teamId, positionId}. It doesn't have role (MB/OH).
        // But we can find it from teams.
        const team = teams.find(t => t.id === selectedPlayer.teamId);
        const player = team?.players.find(p => p.id === selectedPlayer.id);
        
        if (player && player.position === 'MB') {
           const swapLog = swapLibero(selectedPlayer.teamId, 'pos1');
           if (swapLog) {
             setRotationLogs(prev => [...prev, { id: Date.now().toString(), message: swapLog }].slice(0, 5));
           }
        }
      }
    }

    if (winnerId) {
      // If the winner was NOT the serving team (Sideout), they rotate and become server
      if (winnerId !== servingTeamId) {
        handleRotate(winnerId);
        setServingTeamId(winnerId);
      }
      // If winner WAS serving team, they keep serving, no rotation.
    }

    // 3. Reset
    setCourtMode('VIEW');
    setSelectedPlayer(null);
    setTrajectory(null);
    setCurrentAction('');
    setQuality(null);
  };

  // ... (keep existing handlers: getSVGCoords, handleCourtClick, drag handlers)
  const dragMovedRef = useRef(false);

  const getSVGCoords = (e: React.MouseEvent | React.TouchEvent, svg: SVGSVGElement) => {
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  const handleCourtClick = (e: React.MouseEvent<SVGSVGElement>) => {
    // If we just finished dragging, don't set end point
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      return;
    }
    // Also ignore clicks on the start point itself (circle/path)
    if (e.target !== e.currentTarget) return;

    if (courtMode !== 'PLACEMENT' || !trajectory || isDraggingStart) return;

    const { x, y } = getSVGCoords(e, e.currentTarget);
    setTrajectory(prev => ({ ...prev!, end: { x, y } }));
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingStart(true);
    dragMovedRef.current = false;
  };

  const handleDragMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!isDraggingStart || !trajectory) return;
    dragMovedRef.current = true;
    
    const { x, y } = getSVGCoords(e, e.currentTarget);
    setTrajectory(prev => ({ ...prev!, start: { x, y } }));
  };

  const handleDragEnd = () => {
    setIsDraggingStart(false);
  };

  const handleMainAction = (action: string) => {
    if (action === '發球') {
      setActionStep('SERVE_SUB');
    } else if (action === '舉球') {
      setActionStep('SET_SUB');
    } else if (action === '攻擊') {
      setActionStep('ATTACK_SUB');
    } else {
      handleAction(action);
    }
  };

  const padScore = (score: number) => score.toString().padStart(2, '0');

  const renderPlayer = (team: typeof homeTeam, posId: string) => {
    if (!team || courtMode === 'PLACEMENT') return null; // Hide players in placement mode
    const playerId = team.lineup?.[posId as keyof typeof team.lineup];
    const player = team.players.find(p => p.id === playerId);

    if (!player) return (
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center opacity-50">
        <span className="text-xs text-white/70">{posId.replace('pos', '')}</span>
      </div>
    );

    const isHome = team.id === homeTeamId;
    const isLibero = player.position === 'L';
    
    // Libero = Yellow, Team = Red/Blue
    const bgColor = isLibero ? 'bg-yellow-400' : (isHome ? 'bg-red-600' : 'bg-blue-600');
    const textColor = isLibero ? 'text-gray-900' : 'text-white';
    const borderColor = isLibero ? 'border-yellow-600' : 'border-white';
    const roleBg = isLibero ? 'bg-yellow-100 text-yellow-800' : 'bg-white/90 text-gray-900';

    const roleLabel = ROLE_MAP[player.position] || player.position;

    return (
      <div 
        onClick={() => setSelectedPlayer({ id: player.id, name: player.name, number: player.number, teamId: team.id, positionId: posId })}
        className="flex flex-col items-center justify-center gap-1 cursor-pointer hover:scale-110 transition-transform active:scale-95"
      >
        <div className={`w-20 h-20 rounded-full ${bgColor} ${textColor} flex items-center justify-center shadow-md border-4 ${borderColor}`}>
          <span className="text-4xl font-bold">{player.number}</span>
        </div>
        <div className={`${roleBg} px-3 py-1 rounded text-lg font-bold shadow-sm backdrop-blur-sm whitespace-nowrap leading-none`}>
          {roleLabel}
        </div>
      </div>
    );
  };

  const renderLiberoSlot = (team: typeof homeTeam, isHome: boolean) => {
    if (!team) return null;
    
    // Check if Libero is currently on court (Pos 1-6 only)
    const courtPositionIds = [
      team.lineup.pos1, team.lineup.pos2, team.lineup.pos3, 
      team.lineup.pos4, team.lineup.pos5, team.lineup.pos6
    ].filter(id => !!id);
    
    const liberoOnCourt = team.players.find(p => 
      courtPositionIds.includes(p.id) && p.position === 'L'
    );

    let displayPlayer = null;
    let label = '';

    if (liberoOnCourt) {
      // Libero is ON court -> Show the MB who is OFF court (swapped out)
      // Find MBs not on court
      // We need to find the MB who is NOT in Pos 1-6
      displayPlayer = team.players.find(p => p.position === 'MB' && !courtPositionIds.includes(p.id));
      label = '場下 (MB)';
    } else {
      // Libero is OFF court -> Show Libero
      // Priority: assigned libero slot, or any L
      if (team.lineup.libero) {
        displayPlayer = team.players.find(p => p.id === team.lineup.libero);
      } else {
        displayPlayer = team.players.find(p => p.position === 'L');
      }
      label = '自由 (L)';
    }

    if (!displayPlayer) return null;

    // Render logic similar to renderPlayer but fixed styling
    const isLibero = displayPlayer.position === 'L';
    const bgColor = isLibero ? 'bg-yellow-400' : (isHome ? 'bg-red-600' : 'bg-blue-600');
    const textColor = isLibero ? 'text-gray-900' : 'text-white';
    const borderColor = isLibero ? 'border-yellow-600' : 'border-white';
    const roleBg = isLibero ? 'bg-yellow-100 text-yellow-800' : 'bg-white/90 text-gray-900';

    return (
      <div className={`absolute ${isHome ? 'bottom-4 left-4' : 'top-4 left-4'} flex flex-col items-center z-30`}>
        <div className="text-white/50 text-xs font-bold mb-1 uppercase tracking-wider">{label}</div>
        <div className="flex flex-col items-center justify-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
          <div className={`w-16 h-16 rounded-full ${bgColor} ${textColor} flex items-center justify-center shadow-md border-4 ${borderColor}`}>
            <span className="text-2xl font-bold">{displayPlayer.number}</span>
          </div>
          <div className={`${roleBg} px-2 py-0.5 rounded text-sm font-bold shadow-sm backdrop-blur-sm whitespace-nowrap leading-none`}>
            {ROLE_MAP[displayPlayer.position] || displayPlayer.position}
          </div>
        </div>
      </div>
    );
  };

  // Helper to render trajectory lines for stats
  const renderTrajectoryLines = () => {
    const filteredHistory = history.filter(record => {
      if (!record.trajectory || !record.trajectory.end) return false;
      
      // Filter by Player
      if (statsPlayerFilter && record.playerId !== statsPlayerFilter) return false;

      // Filter by Action Type
      if (trajectoryFilter === 'ALL') return true;
      if (trajectoryFilter === 'SERVE') return ['發球', '強發', '飄球'].includes(record.action);
      if (trajectoryFilter === 'ATTACK') return !['發球', '強發', '飄球', '舉球', '接發', '攔網', '防守', '修正'].includes(record.action);
      return false;
    });

    return filteredHistory.map(record => {
      if (!record.trajectory || !record.trajectory.end) return null;
      const isHome = record.teamId === homeTeamId;
      const color = isHome ? 'red' : 'blue';
      
      return (
        <g key={record.id} opacity="0.6">
          <line 
            x1={`${record.trajectory.start.x}%`} 
            y1={`${record.trajectory.start.y}%`} 
            x2={`${record.trajectory.end.x}%`} 
            y2={`${record.trajectory.end.y}%`} 
            stroke={color} 
            strokeWidth="2" 
          />
          <circle cx={`${record.trajectory.end.x}%`} cy={`${record.trajectory.end.y}%`} r="3" fill={color} />
        </g>
      );
    });
  };

  if (!homeTeam || !awayTeam) return null;

  return (
    <div className="h-screen w-screen bg-gray-900 flex overflow-hidden">
      {/* LEFT SIDE: Scoreboard & Video */}
      <div className="w-1/2 flex flex-col border-r border-gray-800">
        {/* Header / Back */}
        <div className="p-4 flex items-center justify-between text-white/50 border-b border-gray-800 relative z-50">
          <button 
            className="flex items-center gap-4 hover:text-white transition-colors cursor-pointer" 
            onClick={handleBack}
          >
            <ArrowLeft size={24} />
            <span className="font-bold">返回設定</span>
          </button>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleNewMatch}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/50 hover:bg-red-800 text-red-200 rounded text-sm transition-colors border border-red-900" 
              title="結束比賽並開新局"
            >
              <RotateCcw size={16} />
              <span className="hidden sm:inline">開新比賽</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm transition-colors" title="儲存進度">
              <Save size={16} />
              <span className="hidden sm:inline">儲存</span>
            </button>
            <button 
              onClick={() => setShowHistory(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${showHistory ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'} rounded text-sm transition-colors`} 
              title="比賽紀錄"
            >
              <FileText size={16} />
              <span className="hidden sm:inline">紀錄</span>
            </button>
            <button 
              onClick={() => setShowStats(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${showStats ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'} rounded text-sm transition-colors`} 
              title="數據分析"
            >
              <BarChart2 size={16} />
              <span className="hidden sm:inline">數據</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm transition-colors" title="下載 CSV">
              <Download size={16} />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* Scoreboard Area */}
        {/* ... (keep existing scoreboard code) ... */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-800/50">
          <div className="flex items-end gap-4 mb-8">
            
            {/* Home Score (Red) */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-red-400 font-bold text-xl mb-1">{homeTeam.name}</div>
              <button 
                onClick={() => setHomeScore(s => s + 1)}
                className="bg-red-600 text-white text-8xl font-bold p-6 rounded-xl shadow-2xl min-w-[180px] text-center font-mono border-b-4 border-red-800 relative overflow-hidden active:scale-95 transition-transform"
              >
                <div className="relative z-10">{padScore(homeScore)}</div>
                {/* Vertical Divider */}
                <div className="absolute top-0 left-1/2 w-[2px] h-full bg-black/20 transform -translate-x-1/2"></div>
                {/* Horizontal Flip Line (Subtle) */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/10 transform -translate-y-1/2"></div>
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => setHomeScore(s => Math.max(0, s - 1))}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white/70 hover:text-white transition-colors"
                >
                  <Minus size={20} />
                </button>
                <button 
                  onClick={() => handleRotate(homeTeamId!)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full text-white/70 hover:text-white text-xs font-bold flex items-center gap-1"
                  title="手動輪轉 (包含自由球員替換)"
                >
                  <RotateCcw size={14} /> 輪轉
                </button>
              </div>
            </div>

            {/* Sets (Small) */}
            <div className="flex gap-4 pb-12">
              {/* Home Set */}
              <div className="flex flex-col items-center gap-1">
                <button 
                  onClick={() => setHomeSetScore(s => s + 1)}
                  className="bg-red-800 text-white text-5xl font-bold px-4 py-6 rounded-lg shadow-lg text-center font-mono border-b-4 border-red-950 relative overflow-hidden active:scale-95 transition-transform"
                >
                  <div className="relative z-10">{homeSetScore}</div>
                  <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20 transform -translate-y-1/2"></div>
                </button>
                <button 
                  onClick={() => setHomeSetScore(s => Math.max(0, s - 1))}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded-full text-white/70 hover:text-white transition-colors"
                >
                  <Minus size={14} />
                </button>
              </div>

              {/* Away Set */}
              <div className="flex flex-col items-center gap-1">
                <button 
                  onClick={() => setAwaySetScore(s => s + 1)}
                  className="bg-blue-800 text-white text-5xl font-bold px-4 py-6 rounded-lg shadow-lg text-center font-mono border-b-4 border-blue-950 relative overflow-hidden active:scale-95 transition-transform"
                >
                  <div className="relative z-10">{awaySetScore}</div>
                  <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/20 transform -translate-y-1/2"></div>
                </button>
                <button 
                  onClick={() => setAwaySetScore(s => Math.max(0, s - 1))}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded-full text-white/70 hover:text-white transition-colors"
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>

            {/* Away Score (Blue) */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-blue-400 font-bold text-xl mb-1">{awayTeam.name}</div>
              <button 
                onClick={() => setAwayScore(s => s + 1)}
                className="bg-blue-600 text-white text-8xl font-bold p-6 rounded-xl shadow-2xl min-w-[180px] text-center font-mono border-b-4 border-blue-800 relative overflow-hidden active:scale-95 transition-transform"
              >
                <div className="relative z-10">{padScore(awayScore)}</div>
                {/* Vertical Divider */}
                <div className="absolute top-0 left-1/2 w-[2px] h-full bg-black/20 transform -translate-x-1/2"></div>
                {/* Horizontal Flip Line (Subtle) */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/10 transform -translate-y-1/2"></div>
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => setAwayScore(s => Math.max(0, s - 1))}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white/70 hover:text-white transition-colors"
                >
                  <Minus size={20} />
                </button>
                <button 
                  onClick={() => handleRotate(awayTeamId!)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full text-white/70 hover:text-white text-xs font-bold flex items-center gap-1"
                  title="手動輪轉 (包含自由球員替換)"
                >
                  <RotateCcw size={14} /> 輪轉
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Video Player Area */}
        <div className="h-1/2 bg-black flex items-center justify-center relative border-t border-gray-800">
          {videoSrc ? (
            <div className="relative w-full h-full">
              <video src={videoSrc} controls className="w-full h-full object-contain" />
              <button 
                onClick={() => setVideoSrc(null)}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/80"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          ) : (
            <div className="text-center w-full h-full flex items-center justify-center">
              <label className="cursor-pointer flex flex-col items-center gap-4 p-8 rounded-xl border-2 border-dashed border-gray-700 hover:border-gray-500 hover:bg-gray-900 transition-all group w-full h-full justify-center">
                <div className="p-4 bg-gray-800 rounded-full group-hover:bg-gray-700 transition-colors">
                  <Upload size={32} className="text-gray-400" />
                </div>
                <div className="text-gray-400 font-medium">點擊上傳比賽影片</div>
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex justify-end">
          <div className="w-96 bg-gray-900 h-full shadow-2xl border-l border-gray-800 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <FileText className="text-blue-500" /> 比賽紀錄
              </h2>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.length === 0 ? (
                <div className="text-center text-gray-500 py-10">尚無紀錄</div>
              ) : (
                history.map(record => (
                  <div 
                    key={record.id} 
                    onClick={() => setSelectedRecord(record)}
                    className="bg-gray-800 p-3 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-gray-400 text-xs">{new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${record.result === 'SCORE' ? 'bg-red-500/20 text-red-400' : record.result === 'FAULT' ? 'bg-gray-500/20 text-gray-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {record.result === 'SCORE' ? '得分' : record.result === 'FAULT' ? '失誤' : '繼續'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${record.teamId === homeTeamId ? 'text-red-400' : 'text-blue-400'}`}>
                        #{record.playerNumber}
                      </span>
                      <span className="text-white">{record.playerName}</span>
                      <span className="text-gray-400">-</span>
                      <span className="text-yellow-400 font-bold">{record.action}</span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 flex justify-between">
                      <span>比分: {record.scoreSnapshot.home} - {record.scoreSnapshot.away}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Detail Popup */}
      {selectedRecord && (
        <div className="absolute inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm text-gray-500 font-bold uppercase">紀錄詳情</div>
                <div className="text-2xl font-black text-gray-900 mt-1">
                  {selectedRecord.action} <span className={`text-sm px-2 py-1 rounded-full align-middle ${selectedRecord.result === 'SCORE' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{selectedRecord.result}</span>
                </div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">球員</div>
                <div className="font-bold text-lg">#{selectedRecord.playerNumber} {selectedRecord.playerName}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-400 mb-1">時間</div>
                <div className="font-bold text-lg">{new Date(selectedRecord.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Mini Trajectory Map */}
            {selectedRecord.trajectory && selectedRecord.trajectory.end && (
              <div className="w-full aspect-[9/16] bg-[#f0d9b5] relative rounded-lg overflow-hidden border-2 border-gray-200">
                <div className="absolute inset-4 border-2 border-white bg-[#ff9f43]">
                   <div className="absolute top-[33%] left-0 right-0 h-0.5 bg-white/50"></div>
                   <div className="absolute bottom-[33%] left-0 right-0 h-0.5 bg-white/50"></div>
                   <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white shadow-sm"></div>
                </div>
                <svg className="absolute inset-0 w-full h-full">
                  <defs>
                    <marker id="arrowhead-detail" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="red" />
                    </marker>
                  </defs>
                  <line 
                    x1={`${selectedRecord.trajectory.start.x}%`} 
                    y1={`${selectedRecord.trajectory.start.y}%`} 
                    x2={`${selectedRecord.trajectory.end.x}%`} 
                    y2={`${selectedRecord.trajectory.end.y}%`} 
                    stroke="red" 
                    strokeWidth="2" 
                    markerEnd="url(#arrowhead-detail)" 
                  />
                  <circle cx={`${selectedRecord.trajectory.start.x}%`} cy={`${selectedRecord.trajectory.start.y}%`} r="3" fill="white" stroke="black" />
                  <circle cx={`${selectedRecord.trajectory.end.x}%`} cy={`${selectedRecord.trajectory.end.y}%`} r="3" fill="red" />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 animate-in fade-in duration-200">
          <div className="bg-gray-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <BarChart2 className="text-blue-500" /> 數據分析
                </h2>
                <div className="flex bg-gray-800 rounded-lg p-1">
                  <button 
                    onClick={() => setStatsTab('SUMMARY')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${statsTab === 'SUMMARY' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    總覽
                  </button>
                  <button 
                    onClick={() => setStatsTab('TRAJECTORY')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${statsTab === 'TRAJECTORY' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                  >
                    落點分析
                  </button>
                </div>
              </div>
              <button onClick={() => setShowStats(false)} className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {statsTab === 'SUMMARY' && (
                <div className="grid grid-cols-2 gap-8">
                  {/* Home Team Stats */}
                  <div className="space-y-4">
                    <h3 className="text-red-400 font-bold text-xl border-b border-gray-800 pb-2">{homeTeam.name}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800 p-4 rounded-xl">
                        <div className="text-gray-400 text-sm">總得分</div>
                        <div className="text-3xl font-black text-white">{homeScore}</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl">
                        <div className="text-gray-400 text-sm">攻擊得分</div>
                        <div className="text-3xl font-black text-white">
                          {history.filter(r => r.teamId === homeTeamId && r.result === 'SCORE' && !['發球', '強發', '飄球'].includes(r.action)).length}
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl">
                        <div className="text-gray-400 text-sm">發球得分</div>
                        <div className="text-3xl font-black text-white">
                          {history.filter(r => r.teamId === homeTeamId && r.result === 'SCORE' && ['發球', '強發', '飄球'].includes(r.action)).length}
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl">
                        <div className="text-gray-400 text-sm">失誤</div>
                        <div className="text-3xl font-black text-white">
                          {history.filter(r => r.teamId === homeTeamId && r.result === 'FAULT').length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Away Team Stats */}
                  <div className="space-y-4">
                    <h3 className="text-blue-400 font-bold text-xl border-b border-gray-800 pb-2">{awayTeam.name}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-800 p-4 rounded-xl">
                        <div className="text-gray-400 text-sm">總得分</div>
                        <div className="text-3xl font-black text-white">{awayScore}</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl">
                        <div className="text-gray-400 text-sm">攻擊得分</div>
                        <div className="text-3xl font-black text-white">
                          {history.filter(r => r.teamId === awayTeamId && r.result === 'SCORE' && !['發球', '強發', '飄球'].includes(r.action)).length}
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl">
                        <div className="text-gray-400 text-sm">發球得分</div>
                        <div className="text-3xl font-black text-white">
                          {history.filter(r => r.teamId === awayTeamId && r.result === 'SCORE' && ['發球', '強發', '飄球'].includes(r.action)).length}
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl">
                        <div className="text-gray-400 text-sm">失誤</div>
                        <div className="text-3xl font-black text-white">
                          {history.filter(r => r.teamId === awayTeamId && r.result === 'FAULT').length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {statsTab === 'TRAJECTORY' && (
                <div className="h-full flex gap-8">
                  {/* Controls */}
                  <div className="w-64 space-y-4 flex flex-col h-full">
                    <div className="bg-gray-800 p-4 rounded-xl">
                      <div className="text-gray-400 text-sm mb-3 font-bold">篩選動作</div>
                      <div className="space-y-2">
                        <button 
                          onClick={() => setTrajectoryFilter('ALL')}
                          className={`w-full text-left px-3 py-2 rounded transition-colors ${trajectoryFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                          全部
                        </button>
                        <button 
                          onClick={() => setTrajectoryFilter('SERVE')}
                          className={`w-full text-left px-3 py-2 rounded transition-colors ${trajectoryFilter === 'SERVE' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                          發球 (Serve)
                        </button>
                        <button 
                          onClick={() => setTrajectoryFilter('ATTACK')}
                          className={`w-full text-left px-3 py-2 rounded transition-colors ${trajectoryFilter === 'ATTACK' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                          攻擊 (Attack)
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-xl flex-1 overflow-hidden flex flex-col">
                      <div className="text-gray-400 text-sm mb-3 font-bold">球員清單</div>
                      <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                        <button 
                          onClick={() => setStatsPlayerFilter(null)}
                          className={`w-full text-left px-3 py-2 rounded transition-colors ${statsPlayerFilter === null ? 'bg-gray-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                        >
                          所有球員
                        </button>
                        
                        {/* Home Team Players */}
                        <div className="text-xs text-red-400 font-bold mt-2 mb-1 px-1">{homeTeam.name}</div>
                        {homeTeam.players.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => setStatsPlayerFilter(p.id)}
                            className={`w-full text-left px-3 py-2 rounded transition-colors flex justify-between ${statsPlayerFilter === p.id ? 'bg-red-900/50 text-red-200 border border-red-800' : 'text-gray-300 hover:bg-gray-700'}`}
                          >
                            <span>#{p.number} {p.name}</span>
                          </button>
                        ))}

                        {/* Away Team Players */}
                        <div className="text-xs text-blue-400 font-bold mt-2 mb-1 px-1">{awayTeam.name}</div>
                        {awayTeam.players.map(p => (
                          <button 
                            key={p.id}
                            onClick={() => setStatsPlayerFilter(p.id)}
                            className={`w-full text-left px-3 py-2 rounded transition-colors flex justify-between ${statsPlayerFilter === p.id ? 'bg-blue-900/50 text-blue-200 border border-blue-800' : 'text-gray-300 hover:bg-gray-700'}`}
                          >
                            <span>#{p.number} {p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Large Court Map */}
                  <div className="flex-1 bg-[#2c3e50] rounded-xl flex items-center justify-center p-8 relative overflow-hidden">
                     <div className="relative h-full aspect-[9/16] bg-[#f0d9b5] shadow-2xl rounded-sm p-8">
                        {/* Court Lines */}
                        <div className="w-full h-full bg-[#ff9f43] border-4 border-white relative shadow-inner">
                           <div className="absolute top-[33%] left-0 right-0 h-1 bg-white/80"></div>
                           <div className="absolute top-1/2 left-0 right-0 h-1 bg-white shadow-sm z-10"></div>
                           <div className="absolute bottom-[33%] left-0 right-0 h-1 bg-white/80"></div>
                        </div>
                        
                        {/* Trajectories Overlay */}
                        <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none p-8">
                           {renderTrajectoryLines()}
                        </svg>
                     </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RIGHT SIDE: Vertical Court */}
      <div className="w-1/2 bg-[#2c3e50] relative flex items-center justify-center p-8 overflow-hidden">
        {/* Action Popup Overlay - Scoped to Right Side */}
        {selectedPlayer && courtMode === 'VIEW' && (
          <div 
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200"
            onClick={() => { setSelectedPlayer(null); setActionStep('MAIN'); }}
          >
            <div 
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">紀錄動作</div>
                <div className="text-3xl font-black text-gray-900">
                  <span className="text-blue-600">#{selectedPlayer.number}</span> {selectedPlayer.name}
                </div>
              </div>

              <div className="space-y-4">
                {/* MAIN MENU */}
                {actionStep === 'MAIN' && (
                  <>
                    {/* Main Actions (Large) */}
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleMainAction('發球')} className="h-20 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-2xl shadow-md active:scale-95 transition-all">
                        發球
                      </button>
                      <button onClick={() => handleMainAction('接發')} className="h-20 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-2xl shadow-md active:scale-95 transition-all">
                        接發
                      </button>
                      <button onClick={() => handleMainAction('舉球')} className="h-20 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-2xl shadow-md active:scale-95 transition-all">
                        舉球
                      </button>
                      <button onClick={() => handleMainAction('攻擊')} className="h-20 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-2xl shadow-md active:scale-95 transition-all">
                        攻擊
                      </button>
                    </div>

                    {/* Secondary Actions (Small) */}
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      <button onClick={() => handleAction('攔網')} className="h-12 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-sm active:scale-95 transition-all">
                        攔網
                      </button>
                      <button onClick={() => handleAction('防守')} className="h-12 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-sm active:scale-95 transition-all">
                        防守
                      </button>
                      <button onClick={() => handleAction('修正')} className="h-12 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-bold shadow-sm active:scale-95 transition-all">
                        修正
                      </button>
                      <button onClick={() => handleAction('失誤')} className="h-12 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold shadow-sm active:scale-95 transition-all">
                        失誤
                      </button>
                    </div>
                  </>
                )}

                {/* SERVE SUB-MENU */}
                {actionStep === 'SERVE_SUB' && (
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => handleAction('強發')} className="h-24 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-2xl shadow-md active:scale-95 transition-all">
                      強發
                    </button>
                    <button onClick={() => handleAction('飄球')} className="h-24 rounded-xl bg-emerald-400 hover:bg-emerald-500 text-white font-bold text-2xl shadow-md active:scale-95 transition-all">
                      飄球
                    </button>
                  </div>
                )}

                {/* SET SUB-MENU */}
                {actionStep === 'SET_SUB' && (
                  <div className="flex flex-col gap-2">
                    {/* Row 1: Amber Group + Pink Group */}
                    <div className="grid grid-cols-4 gap-2">
                      <button onClick={() => handleAction('A快')} className="h-16 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">A快</button>
                      <button onClick={() => handleAction('B快')} className="h-16 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">B快</button>
                      <button onClick={() => handleAction('C快')} className="h-16 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">C快</button>
                      <button onClick={() => handleAction('二攻')} className="h-16 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">二攻</button>
                    </div>
                    
                    {/* Row 2: Indigo Group */}
                    <div className="grid grid-cols-4 gap-2">
                      <button onClick={() => handleAction('長攻')} className="h-16 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">長攻</button>
                      <button onClick={() => handleAction('背長')} className="h-16 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">背長</button>
                      <button onClick={() => handleAction('背飛')} className="h-16 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">背飛</button>
                      <button onClick={() => handleAction('後排')} className="h-16 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">後排</button>
                    </div>
                  </div>
                )}

                {/* ATTACK SUB-MENU */}
                {actionStep === 'ATTACK_SUB' && (
                  <div className="flex flex-col gap-2">
                    {/* Row 1: Rose Group */}
                    <div className="grid grid-cols-4 gap-2">
                      <button onClick={() => handleAction('A快')} className="h-16 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">A快</button>
                      <button onClick={() => handleAction('B快')} className="h-16 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">B快</button>
                      <button onClick={() => handleAction('C快')} className="h-16 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">C快</button>
                      <button onClick={() => handleAction('背飛')} className="h-16 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">背飛</button>
                    </div>
                    
                    {/* Row 2: Orange Group */}
                    <div className="grid grid-cols-5 gap-2">
                      <button onClick={() => handleAction('長攻')} className="h-16 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">長攻</button>
                      <button onClick={() => handleAction('後排')} className="h-16 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">後排</button>
                      <button onClick={() => handleAction('時間差')} className="h-16 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">時間差</button>
                      <button onClick={() => handleAction('打手')} className="h-16 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">打手</button>
                      <button onClick={() => handleAction('吊球')} className="h-16 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg shadow-sm active:scale-95 transition-all">吊球</button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                {actionStep !== 'MAIN' ? (
                  <button onClick={() => setActionStep('MAIN')} className="text-gray-500 hover:text-gray-700 text-sm font-bold px-4 py-2 flex items-center justify-center gap-1 mx-auto">
                    <ArrowLeft size={16} /> 返回上一層
                  </button>
                ) : (
                  <button onClick={() => setSelectedPlayer(null)} className="text-gray-400 hover:text-gray-600 text-sm font-medium px-4 py-2">
                    取消
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Result Buttons (Placement Mode) */}
        {courtMode === 'PLACEMENT' && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
            {/* Quality Options */}
            <div className="bg-gray-900/90 backdrop-blur rounded-xl p-2 flex flex-col gap-2 mb-4 border border-gray-700">
              {['完美', '到位', '普通', '處理', '失誤'].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`w-20 py-2 rounded-lg text-sm font-bold transition-all ${
                    quality === q 
                      ? 'bg-yellow-500 text-black shadow-lg scale-105' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            <button onClick={() => handlePlacementComplete('SCORE')} className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg active:scale-95 transition-all border-4 border-white">
              得分
            </button>
            <button onClick={() => handlePlacementComplete('FAULT')} className="w-20 h-20 rounded-full bg-gray-600 hover:bg-gray-700 text-white font-bold shadow-lg active:scale-95 transition-all border-4 border-white">
              失誤
            </button>
            <button onClick={() => handlePlacementComplete('CONTINUE')} className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg active:scale-95 transition-all border-4 border-white">
              繼續
            </button>
          </div>
        )}

        {/* Gym Floor (Out of bounds area) */}
        <div className="relative h-[95%] aspect-[9/16] bg-[#f0d9b5] shadow-2xl rounded-sm p-12">
          
          {/* Yellow Libero Positions - Replaced by renderLiberoSlot */}
          {renderLiberoSlot(awayTeam, false)}
          {renderLiberoSlot(homeTeam, true)}

          {/* Smart Landing Point Overlay */}
          {courtMode === 'PLACEMENT' && trajectory && (
            <svg 
              className="absolute inset-0 w-full h-full z-40 cursor-crosshair touch-none"
              onClick={handleCourtClick}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="red" />
                </marker>
              </defs>
              
              {/* Start Point (Draggable Volleyball) */}
              <svg 
                x={`${trajectory.start.x}%`} 
                y={`${trajectory.start.y}%`} 
                width="0" 
                height="0" 
                style={{ overflow: 'visible' }}
              >
                <g 
                  style={{ cursor: 'grab' }}
                  onMouseDown={handleDragStart}
                  onTouchStart={handleDragStart}
                >
                   {/* Realistic Volleyball Icon */}
                   <circle r="12" fill="white" stroke="#333" strokeWidth="1.5" />
                   <path d="M-11 2 Q 0 -6 11 2" fill="none" stroke="#333" strokeWidth="1.5" />
                   <path d="M-2 -11 Q 6 0 -2 11" fill="none" stroke="#333" strokeWidth="1.5" />
                   <path d="M-8 -8 Q 0 0 8 8" fill="none" stroke="#333" strokeWidth="1.5" />
                   <path d="M8 -8 Q 0 0 -8 8" fill="none" stroke="#333" strokeWidth="1.5" />
                </g>
              </svg>
              
              {/* End Point & Line */}
              {trajectory.end && (
                <>
                  <line 
                    x1={`${trajectory.start.x}%`} 
                    y1={`${trajectory.start.y}%`} 
                    x2={`${trajectory.end.x}%`} 
                    y2={`${trajectory.end.y}%`} 
                    stroke="red" 
                    strokeWidth="4" 
                    markerEnd="url(#arrowhead)" 
                    pointerEvents="none"
                  />
                  <circle cx={`${trajectory.end.x}%`} cy={`${trajectory.end.y}%`} r="6" fill="red" pointerEvents="none" />
                </>
              )}
            </svg>
          )}

          {/* The Court (In bounds) */}
          <div className="w-full h-full bg-[#ff9f43] border-4 border-white relative flex flex-col shadow-inner">
            
            {/* Top Half (Away Team) */}
            <div className="flex-1 relative border-b-2 border-white/50 flex flex-col">
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <span className="text-6xl font-black text-blue-900 inline-block transform rotate-180 whitespace-nowrap">{awayTeam.name}</span>
              </div>
              
              {/* 3-meter line (Attack line) */}
              <div className="absolute bottom-[33%] left-0 right-0 h-1 bg-white/80"></div>

              {/* Players Grid */}
              <div className="flex-1 flex flex-col justify-around py-4 px-4 relative z-10">
                {/* Back Row (Away) */}
                <div className="flex justify-around">
                  {POSITIONS.away.row2.map(pos => (
                    <div key={pos}>
                      {renderPlayer(awayTeam, pos)}
                    </div>
                  ))}
                </div>
                {/* Front Row (Away) */}
                <div className="flex justify-around">
                  {POSITIONS.away.row1.map(pos => (
                    <div key={pos}>
                      {renderPlayer(awayTeam, pos)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Libero Slot (Away) - Moved to Gym Floor */}
            </div>

            {/* Net */}
            <div className="h-1 bg-white w-full relative z-20 flex items-center justify-center">
              {/* Net Shadow/Visual */}
              <div className="absolute -left-4 -right-4 h-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
            </div>

            {/* Bottom Half (Home Team) */}
            <div className="flex-1 relative border-t-2 border-white/50 flex flex-col">
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <span className="text-6xl font-black text-red-900 whitespace-nowrap">{homeTeam.name}</span>
              </div>

              {/* 3-meter line (Attack line) */}
              <div className="absolute top-[33%] left-0 right-0 h-1 bg-white/80"></div>

              {/* Players Grid */}
              <div className="flex-1 flex flex-col justify-around py-4 px-4 relative z-10">
                {/* Front Row (Home) */}
                <div className="flex justify-around">
                  {POSITIONS.home.row1.map(pos => (
                    <div key={pos}>
                      {renderPlayer(homeTeam, pos)}
                    </div>
                  ))}
                </div>
                {/* Back Row (Home) */}
                <div className="flex justify-around">
                  {POSITIONS.home.row2.map(pos => (
                    <div key={pos}>
                      {renderPlayer(homeTeam, pos)}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Libero Slot (Home) - Moved to Gym Floor */}
            </div>

          </div>
          
          {/* Out of Bounds Lines (Service Marks) */}
          {/* Top Service Marks */}
          <div className="absolute top-12 right-12 w-[2px] h-4 bg-white -translate-y-full"></div>
          <div className="absolute top-12 left-12 w-[2px] h-4 bg-white -translate-y-full"></div>
          
          {/* Bottom Service Marks */}
          <div className="absolute bottom-12 right-12 w-[2px] h-4 bg-white translate-y-full"></div>
          <div className="absolute bottom-12 left-12 w-[2px] h-4 bg-white translate-y-full"></div>

        </div>
      </div>
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="absolute inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{confirmModal.title}</h3>
            <p className="text-gray-600 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={closeConfirmModal}
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  closeConfirmModal();
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-bold shadow-sm transition-colors"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Rotation Logs Toast */}
      {rotationLogs.length > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[90] flex flex-col gap-2 w-full max-w-md pointer-events-none">
          {rotationLogs.map(log => (
            <div key={log.id} className="bg-black/80 text-white px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm text-sm animate-in slide-in-from-top-2 fade-in duration-300 border-l-4 border-blue-500">
              {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

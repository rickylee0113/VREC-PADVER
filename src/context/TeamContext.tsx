import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Team, Player } from '../types';

interface TeamContextType {
  teams: Team[];
  currentMatch: { homeTeamId: string | null; awayTeamId: string | null };
  setCurrentMatch: (homeId: string, awayId: string) => void;
  addTeam: (name: string, type: 'Home' | 'Away') => void;
  createTeam: (name: string, type: 'Home' | 'Away', initialPlayers: Omit<Player, 'id'>[]) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  addPlayerToTeam: (teamId: string, player: Omit<Player, 'id'>) => void;
  removePlayerFromTeam: (teamId: string, playerId: string) => void;
  updateLineup: (teamId: string, position: string, playerId: string | undefined) => void;
  rotateLineup: (teamId: string) => string[];
  swapLibero: (teamId: string, position: string) => string | null;
  loadDummyData: () => { homeId: string, awayId: string };
  clearMatchData: () => void;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export const useTeams = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeams must be used within a TeamProvider');
  }
  return context;
};

export const TeamProvider = ({ children }: { children: ReactNode }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentMatch, setCurrentMatchState] = useState<{ homeTeamId: string | null; awayTeamId: string | null }>({
    homeTeamId: null,
    awayTeamId: null
  });

  const setCurrentMatch = (homeId: string, awayId: string) => {
    setCurrentMatchState({ homeTeamId: homeId, awayTeamId: awayId });
  };

  const addTeam = (name: string, type: 'Home' | 'Away') => {
    const newTeam: Team = {
      id: generateId(),
      name,
      type,
      players: [],
      lineup: {}
    };
    setTeams(prev => [...prev, newTeam]);
  };

  const createTeam = (name: string, type: 'Home' | 'Away', initialPlayers: Omit<Player, 'id'>[]) => {
    const newTeam: Team = {
      id: generateId(),
      name,
      type,
      players: initialPlayers.map(p => ({ ...p, id: generateId() })),
      lineup: {}
    };
    setTeams(prev => [...prev, newTeam]);
  };

  const updateTeam = (id: string, updates: Partial<Team>) => {
    setTeams(prev => prev.map(team => team.id === id ? { ...team, ...updates } : team));
  };

  const deleteTeam = (id: string) => {
    setTeams(prev => prev.filter(team => team.id !== id));
  };

  const addPlayerToTeam = (teamId: string, player: Omit<Player, 'id'>) => {
    setTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        return {
          ...team,
          players: [...team.players, { ...player, id: generateId() }]
        };
      }
      return team;
    }));
  };

  const removePlayerFromTeam = (teamId: string, playerId: string) => {
    setTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        // Also remove from lineup if present
        const newLineup = { ...team.lineup };
        Object.keys(newLineup).forEach(key => {
          if (newLineup[key as keyof typeof newLineup] === playerId) {
            delete newLineup[key as keyof typeof newLineup];
          }
        });

        return {
          ...team,
          players: team.players.filter(p => p.id !== playerId),
          lineup: newLineup
        };
      }
      return team;
    }));
  };

  const updateLineup = (teamId: string, position: string, playerId: string | undefined) => {
    setTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        const newLineup = { ...team.lineup };
        if (playerId === undefined) {
          delete newLineup[position as keyof typeof newLineup];
        } else {
          // If player is already in another position, remove them from there
          Object.keys(newLineup).forEach(key => {
            if (newLineup[key as keyof typeof newLineup] === playerId) {
              delete newLineup[key as keyof typeof newLineup];
            }
          });
          // Assign to new position
          (newLineup as any)[position] = playerId;
        }
        return { ...team, lineup: newLineup };
      }
      return team;
    }));
  };

  const rotateLineup = (teamId: string): string[] => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return [];

    const logs: string[] = [];
    const oldLineup = { ...team.lineup };
    const newLineup: typeof team.lineup = {};

    // Standard Rotation (Clockwise)
    if (oldLineup.pos1) newLineup.pos6 = oldLineup.pos1;
    if (oldLineup.pos6) newLineup.pos5 = oldLineup.pos6;
    if (oldLineup.pos5) newLineup.pos4 = oldLineup.pos5;
    if (oldLineup.pos4) newLineup.pos3 = oldLineup.pos4;
    if (oldLineup.pos3) newLineup.pos2 = oldLineup.pos3;
    if (oldLineup.pos2) newLineup.pos1 = oldLineup.pos2;

    // Preserve Libero slot
    if (oldLineup.libero) newLineup.libero = oldLineup.libero;

    // --- Libero Exchange Logic ---
    const getPlayer = (id: string | undefined) => team.players.find(p => p.id === id);
    
    // Helper to get current players on court (to find who is on bench)
    const getCourtPlayerIds = (lineup: typeof newLineup) => {
      return [
        lineup.pos1, lineup.pos2, lineup.pos3, 
        lineup.pos4, lineup.pos5, lineup.pos6
      ].filter((id): id is string => !!id);
    };

    // 1. Check Front Row (Pos 4): L -> MB
    // When L rotates from Pos 5 to Pos 4, they must leave.
    const playerAtPos4 = getPlayer(newLineup.pos4);
    if (playerAtPos4 && playerAtPos4.position === 'L') {
      const courtPlayerIds = getCourtPlayerIds(newLineup);
      // Find the MB who is NOT on court (the one L replaced)
      const benchMB = team.players.find(p => 
        p.position === 'MB' && !courtPlayerIds.includes(p.id)
      );

      if (benchMB) {
        // logs.push(`自由球員 ${playerAtPos4.name} 轉至前排 (4號位)，換回快攻 ${benchMB.name}`);
        logs.push(`自由${playerAtPos4.number}換快攻${benchMB.number}`);
        newLineup.pos4 = benchMB.id;
      } else {
        // logs.push(`自由球員 ${playerAtPos4.name} 轉至前排 (4號位)，但找不到板凳上的快攻球員`);
      }
    }

    // 2. Check Back Row (Pos 6): MB -> L
    // When MB rotates from Pos 1 to Pos 6, they leave (after serving).
    const playerAtPos6 = getPlayer(newLineup.pos6);
    if (playerAtPos6 && playerAtPos6.position === 'MB') {
      const courtPlayerIds = getCourtPlayerIds(newLineup);
      
      // Find the Libero to swap in
      // Priority: The designated Libero in lineup.libero, or any L on bench
      let liberoPlayer = team.lineup.libero ? getPlayer(team.lineup.libero) : null;
      
      // ... (comments removed for brevity) ...
      
      if (liberoPlayer && courtPlayerIds.includes(liberoPlayer.id)) {
        // Libero is on court. Check if they are the one at Pos 4 who just got swapped out?
        // We already updated newLineup.pos4 to MB. So getCourtPlayerIds(newLineup) will NOT include L if we did step 1 first.
        // So this check is fine.
      } else if (!liberoPlayer) {
          // Find any L on bench
          liberoPlayer = team.players.find(p => p.position === 'L' && !courtPlayerIds.includes(p.id));
      }

      if (liberoPlayer && !courtPlayerIds.includes(liberoPlayer.id)) {
        // logs.push(`快攻 ${playerAtPos6.name} 轉至後排 (6號位)，換上自由球員 ${liberoPlayer.name}`);
        logs.push(`快攻${playerAtPos6.number}換自由${liberoPlayer.number}`);
        newLineup.pos6 = liberoPlayer.id;
      }
    }

    // Update State
    setTeams(prev => prev.map(t => t.id === teamId ? { ...t, lineup: newLineup } : t));
    
    return logs;
  };

  // Special Swap for Libero (e.g., MB serves fault -> L replaces MB at Pos 1 immediately)
  const swapLibero = (teamId: string, position: string): string | null => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return null;

    const currentLineup = { ...team.lineup };
    const playerIdAtPos = currentLineup[position as keyof typeof currentLineup];
    const playerAtPos = team.players.find(p => p.id === playerIdAtPos);

    if (!playerAtPos) return null;

    // Logic: If MB is at Pos, swap with L from bench.
    // If L is at Pos, swap with MB from bench.
    
    const courtPlayerIds = [
      currentLineup.pos1, currentLineup.pos2, currentLineup.pos3, 
      currentLineup.pos4, currentLineup.pos5, currentLineup.pos6
    ].filter((id): id is string => !!id);

    let targetPlayer = null;

    if (playerAtPos.position === 'MB') {
      // MB -> L
      // Find L on bench
      // Priority: Designated Libero, or any L
      if (team.lineup.libero && !courtPlayerIds.includes(team.lineup.libero)) {
        targetPlayer = team.players.find(p => p.id === team.lineup.libero);
      } else {
        targetPlayer = team.players.find(p => p.position === 'L' && !courtPlayerIds.includes(p.id));
      }
    } else if (playerAtPos.position === 'L') {
      // L -> MB
      // Find MB on bench
      targetPlayer = team.players.find(p => p.position === 'MB' && !courtPlayerIds.includes(p.id));
    }

    if (targetPlayer) {
      (currentLineup as any)[position] = targetPlayer.id;
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, lineup: currentLineup } : t));
      
      if (playerAtPos.position === 'MB') {
        return `快攻${playerAtPos.number}換自由${targetPlayer.number}`;
      } else {
        return `自由${playerAtPos.number}換快攻${targetPlayer.number}`;
      }
    }

    return null;
  };

  const loadDummyData = () => {
    // Check if dummy teams already exist
    const existingHome = teams.find(t => t.name === '台電女排' && t.isTemp);
    const existingAway = teams.find(t => t.name === '台北鯨華' && t.isTemp);

    if (existingHome && existingAway) {
      return { homeId: existingHome.id, awayId: existingAway.id };
    }

    const homeId = generateId();
    const awayId = generateId();
    
    const newTeams: Team[] = [];

    if (!existingHome) {
      const homePlayers: Player[] = [
        { id: generateId(), number: '1', name: '賴湘程', position: 'L' },
        { id: generateId(), number: '4', name: '李姿瑩', position: 'OH' },
        { id: generateId(), number: '6', name: '陳姿雅', position: 'OH' },
        { id: generateId(), number: '7', name: '黃芯瑜', position: 'MB' },
        { id: generateId(), number: '11', name: '陳曦', position: 'MB' },
        { id: generateId(), number: '12', name: '廖苡任', position: 'S' },
        { id: generateId(), number: '17', name: '黃瀞萱', position: 'OP' },
        { id: generateId(), number: '2', name: '張荔勻', position: 'OH' },
        { id: generateId(), number: '3', name: '曾琬羚', position: 'MB' },
        { id: generateId(), number: '5', name: '郭覲儀', position: 'OH' },
        { id: generateId(), number: '9', name: '許菀芸', position: 'OH' },
        { id: generateId(), number: '13', name: '劉煜淳', position: 'S' },
      ];
      
      // Assign Lineup: S=3, OH=1&4, MB=2&5, OP=6
      const homeLineup = {
        pos3: homePlayers.find(p => p.number === '12')?.id, // S
        pos4: homePlayers.find(p => p.number === '4')?.id,  // OH
        pos1: homePlayers.find(p => p.number === '6')?.id,  // OH
        pos2: homePlayers.find(p => p.number === '7')?.id,  // MB
        pos5: homePlayers.find(p => p.number === '11')?.id, // MB
        pos6: homePlayers.find(p => p.number === '17')?.id, // OP
        libero: homePlayers.find(p => p.number === '1')?.id, // L
      };

      newTeams.push({
        id: homeId,
        name: '台電女排',
        type: 'Home',
        isTemp: true,
        players: homePlayers,
        lineup: homeLineup
      });
    }

    if (!existingAway) {
      const awayPlayers: Player[] = [
        { id: generateId(), number: '5', name: '吳芳妤', position: 'OH' },
        { id: generateId(), number: '8', name: '廖琴玉', position: 'S' },
        { id: generateId(), number: '9', name: '甘可慧', position: 'MB' },
        { id: generateId(), number: '12', name: '陳佳蔓', position: 'S' },
        { id: generateId(), number: '13', name: '蔡沁瑶', position: 'MB' },
        { id: generateId(), number: '16', name: '陳潔', position: 'OH' },
        { id: generateId(), number: '19', name: '賴乙鏵', position: 'L' },
        { id: generateId(), number: '2', name: '林書荷', position: 'OH' },
        { id: generateId(), number: '3', name: '蕭湘凌', position: 'OH' },
        { id: generateId(), number: '6', name: '翁梓勻', position: 'MB' },
        { id: generateId(), number: '7', name: '林良黛', position: 'OH' },
        { id: generateId(), number: '18', name: '邱雅慧', position: 'OP' },
      ];

      // Assign Lineup: S=3, OH=1&4, MB=2&5, OP=6
      const awayLineup = {
        pos3: awayPlayers.find(p => p.number === '8')?.id,  // S
        pos4: awayPlayers.find(p => p.number === '5')?.id,  // OH
        pos1: awayPlayers.find(p => p.number === '2')?.id,  // OH
        pos2: awayPlayers.find(p => p.number === '9')?.id,  // MB
        pos5: awayPlayers.find(p => p.number === '13')?.id, // MB
        pos6: awayPlayers.find(p => p.number === '18')?.id, // OP
        libero: awayPlayers.find(p => p.number === '19')?.id, // L
      };

      newTeams.push({
        id: awayId,
        name: '台北鯨華',
        type: 'Away',
        isTemp: true,
        players: awayPlayers,
        lineup: awayLineup
      });
    }

    setTeams(prev => [...prev, ...newTeams]);
    
    return { 
      homeId: existingHome ? existingHome.id : homeId, 
      awayId: existingAway ? existingAway.id : awayId 
    };
  };

  const clearMatchData = () => {
    setTeams(prev => prev.map(t => ({ ...t, lineup: {} })));
    setCurrentMatchState({ homeTeamId: null, awayTeamId: null });
  };

  return (
    <TeamContext.Provider value={{ 
      teams, 
      currentMatch, 
      setCurrentMatch, 
      addTeam, 
      createTeam, 
      updateTeam, 
      deleteTeam, 
      addPlayerToTeam, 
      removePlayerFromTeam, 
      updateLineup, 
      rotateLineup,
      swapLibero,
      loadDummyData, 
      clearMatchData 
    }}>
      {children}
    </TeamContext.Provider>
  );
};

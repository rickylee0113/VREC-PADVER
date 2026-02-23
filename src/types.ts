export type Position = 'MB' | 'OH' | 'OP' | 'S' | 'L' | 'DS' | 'Unknown';

export interface Player {
  id: string;
  number: string;
  name: string;
  position: Position;
}

export interface Team {
  id: string;
  name: string;
  type: 'Home' | 'Away'; // 主隊 / 客隊
  players: Player[];
  isTemp?: boolean; // Temporary team for quick match
  lineup?: {
    pos1?: string; // Player ID
    pos2?: string;
    pos3?: string;
    pos4?: string;
    pos5?: string;
    pos6?: string;
    libero?: string;
  };
}

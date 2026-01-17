
export type Player = 'X' | 'O' | null;

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Move {
  boardId: number;
  pos: Position;
  player: Player;
  timestamp: number;
}

export enum PowerUpType {
  SWAP = 'Swap',
  REMOVE = 'Remove',
  BLOCK = 'Block',
  PEEK = 'Peek',
  CLONE = 'Clone'
}

export interface PowerUp {
  type: PowerUpType;
  cost: number;
  description: string;
}

export enum Difficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export type BoardState = Player[][][]; // 4x4x4

export interface GameState {
  boards: BoardState[];
  scores: { X: number; O: number };
  wallet: number;
  history: Move[];
  currentPlayer: Player;
  difficulty: Difficulty;
  isGameOver: boolean;
  winner: Player | 'Draw' | null;
  selectedPowerUp: PowerUpType | null;
  blockedCells: Set<string>[]; // "x-y-z" format for each board
  winningCells: Set<string>[]; // "x-y-z" format for highlighting winners
  isTestingMode: boolean;
}

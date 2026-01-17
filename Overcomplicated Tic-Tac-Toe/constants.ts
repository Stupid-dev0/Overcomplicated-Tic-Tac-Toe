
import { PowerUpType, PowerUp } from './types';

export const BOARD_COUNT = 2;

// Define specific dimensions for each board
export const BOARD_SPECS = [
  { id: 0, rows: 4, cols: 4, depth: 4, label: "ALPHA [EUCLIDEAN]" },
  { id: 1, rows: 4, cols: 4, depth: 4, label: "BETA [NON-EUCLIDEAN]" }
];

export const POWER_UPS: PowerUp[] = [
  { type: PowerUpType.SWAP, cost: 40, description: "Exchange any two pieces on any board." },
  { type: PowerUpType.REMOVE, cost: 30, description: "Delete one opponent piece." },
  { type: PowerUpType.BLOCK, cost: 25, description: "Freeze a space for 3 turns." },
  { type: PowerUpType.PEEK, cost: 15, description: "See AI's next intended move." },
  { type: PowerUpType.CLONE, cost: 50, description: "Copy your last move to another space." }
];

export const SCORING = {
  LINE: 10,
  DIAGONAL_PLANE: 25,
  DIAGONAL_3D: 50
};

export const INITIAL_WALLET = 100;
export const UNDO_COST = 5;

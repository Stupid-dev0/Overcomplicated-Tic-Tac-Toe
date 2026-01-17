import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GameState, Player, Position, Difficulty, 
  PowerUpType, Move 
} from './types';
import { 
  createEmptyBoards, checkWin, getAiMove, GlobalPosition
} from './services/gameLogic';
import { 
  BOARD_COUNT, INITIAL_WALLET, POWER_UPS, 
  SCORING, UNDO_COST, BOARD_SPECS 
} from './constants';
import { Board3D } from './components/Board3D';

// AI Reaction Speed (ms)
const AI_THINK_TIME = 100;

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    boards: createEmptyBoards(),
    scores: { X: 0, O: 0 },
    wallet: INITIAL_WALLET,
    history: [],
    currentPlayer: 'X',
    difficulty: Difficulty.MEDIUM,
    isGameOver: false,
    winner: null,
    selectedPowerUp: null,
    blockedCells: Array.from({ length: BOARD_COUNT }, () => new Set<string>()),
    winningCells: Array.from({ length: BOARD_COUNT }, () => new Set<string>()),
    isTestingMode: false,
  });

  const [aiThinking, setAiThinking] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const isMoving = useRef(false);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const makeMove = useCallback((boardId: number, pos: Position, player: Player) => {
    setGameState(prev => {
      // Create deep copy of boards
      const newBoards = prev.boards.map(b => b.map(row => row.map(col => [...col])));
      newBoards[boardId][pos.x][pos.y][pos.z] = player;

      const newHistory: Move[] = [...prev.history, { boardId, pos, player, timestamp: Date.now() }];
      
      let pointsEarned = 0;
      
      // CHECK WIN ACROSS ALL BOARDS (Global Space)
      const winData = checkWin(newBoards);
      
      const newWinningCells = Array.from({ length: BOARD_COUNT }, () => new Set<string>());

      if (winData.winner === player) {
        pointsEarned = winData.lines.length * SCORING.LINE;
        
        // Bonus Calculation
        winData.lines.forEach((line: GlobalPosition[]) => {
          // Track winning cells
          line.forEach(p => {
            newWinningCells[p.boardId].add(`${p.x}-${p.y}-${p.z}`);
          });

          // Check for Cross-Board Win (Hyper-dimensional)
          const uniqueBoards = new Set(line.map(p => p.boardId));
          if (uniqueBoards.size > 1) {
            pointsEarned += SCORING.DIAGONAL_3D * 2; // Mega bonus for cross-board
          } 
          // Check for standard 3D diagonals (change in Z within a board)
          else if (line.some(p => p.z !== line[0].z)) {
            pointsEarned += SCORING.DIAGONAL_3D;
          }
        });
      }

      const nextPlayer = player === 'X' ? 'O' : 'X';
      const allBoardsFull = newBoards.every(b => 
        b.every(row => row.every(layer => layer.every(cell => cell !== null)))
      );
      const hasWinner = winData.winner !== null;

      return {
        ...prev,
        boards: newBoards,
        wallet: player === 'X' ? prev.wallet + pointsEarned : prev.wallet,
        scores: player === 'X' ? { ...prev.scores, X: prev.scores.X + pointsEarned } : prev.scores,
        history: newHistory,
        currentPlayer: nextPlayer,
        isGameOver: hasWinner || allBoardsFull,
        winner: hasWinner ? winData.winner : allBoardsFull ? 'Draw' : null,
        winningCells: newWinningCells
      };
    });
    isMoving.current = false;
  }, []);

  const handleCellClick = (boardId: number, pos: Position) => {
    // Allow move if it's Player X's turn OR if Testing Mode is active (allowing manual play for O)
    const isTurnAllowed = gameState.currentPlayer === 'X' || gameState.isTestingMode;
    
    if (isMoving.current || gameState.isGameOver || !isTurnAllowed || aiThinking) return;

    if (gameState.boards[boardId][pos.x][pos.y][pos.z] || gameState.blockedCells[boardId].has(`${pos.x}-${pos.y}-${pos.z}`)) {
      return;
    }

    isMoving.current = true;
    makeMove(boardId, pos, gameState.currentPlayer);
  };

  // AI Brain
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    // Only run AI if NOT in testing mode
    if (gameState.currentPlayer === 'O' && !gameState.isGameOver && !gameState.isTestingMode) {
      // Only set thinking state if we haven't already
      if (!aiThinking) {
        setAiThinking(true);
      }

      timer = setTimeout(() => {
        // Double check state before moving (though cleanup usually handles this)
        if (gameState.currentPlayer === 'O' && !gameState.isGameOver && !gameState.isTestingMode) {
          const aiMove = getAiMove(gameState.boards, gameState.difficulty, gameState.blockedCells);
          isMoving.current = true;
          makeMove(aiMove.boardId, aiMove.pos, 'O');
          setAiThinking(false);
        }
      }, AI_THINK_TIME);
    } else if (gameState.currentPlayer === 'X' && aiThinking) {
      // Ensure thinking is false if it's player turn
      setAiThinking(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [gameState.currentPlayer, gameState.isGameOver, gameState.boards, gameState.difficulty, gameState.blockedCells, gameState.isTestingMode, makeMove]); 

  const usePowerUp = (type: PowerUpType) => {
    const powerUp = POWER_UPS.find(p => p.type === type);
    if (!powerUp || gameState.wallet < powerUp.cost) {
      notify("CREDITS LOW");
      return;
    }

    setGameState(prev => ({
      ...prev,
      wallet: prev.wallet - powerUp.cost,
      selectedPowerUp: type
    }));

    if (type === PowerUpType.PEEK) {
      const nextAi = getAiMove(gameState.boards, gameState.difficulty, gameState.blockedCells);
      notify(`AI TARGET: B${nextAi.boardId+1} L${nextAi.pos.z + 1}`);
    } else {
      notify(`SYSTEM: ${type.toUpperCase()} ENGAGED`);
    }
  };

  const undoMove = () => {
    if (gameState.history.length < 2 || gameState.wallet < UNDO_COST || isMoving.current || aiThinking) {
      notify("SHIFT BLOCKED");
      return;
    }

    setGameState(prev => {
      const lastAi = prev.history[prev.history.length - 1];
      const lastUser = prev.history[prev.history.length - 2];
      
      const newBoards = prev.boards.map(b => b.map(row => row.map(col => [...col])));
      newBoards[lastAi.boardId][lastAi.pos.x][lastAi.pos.y][lastAi.pos.z] = null;
      newBoards[lastUser.boardId][lastUser.pos.x][lastUser.pos.y][lastUser.pos.z] = null;

      return {
        ...prev,
        boards: newBoards,
        history: prev.history.slice(0, -2),
        wallet: prev.wallet - UNDO_COST,
        currentPlayer: 'X',
        isGameOver: false,
        winner: null,
        winningCells: Array.from({ length: BOARD_COUNT }, () => new Set<string>())
      };
    });
  };

  const resetGame = () => {
    isMoving.current = false;
    setAiThinking(false);
    setGameState(prev => ({
      boards: createEmptyBoards(),
      scores: { X: 0, O: 0 },
      wallet: INITIAL_WALLET,
      history: [],
      currentPlayer: 'X',
      difficulty: prev.difficulty, // Preserve difficulty
      isTestingMode: prev.isTestingMode, // Preserve testing mode
      isGameOver: false,
      winner: null,
      selectedPowerUp: null,
      blockedCells: Array.from({ length: BOARD_COUNT }, () => new Set<string>()),
      winningCells: Array.from({ length: BOARD_COUNT }, () => new Set<string>()),
    }));
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center bg-[radial-gradient(circle_at_center,_#0a0f1d_0%,_#030712_100%)]">
      {/* Scanline Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]"></div>

      <header className="w-full max-w-[1400px] flex flex-col md:flex-row justify-between items-center mb-10 gap-6 z-10 px-4">
        <div className="text-center md:text-left">
          <h1 className="orbitron text-5xl md:text-7xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-400 to-purple-700 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            HYPER-SPACE
          </h1>
          <p className="text-[10px] text-cyan-500 tracking-[0.6em] font-bold mt-2 uppercase">Neural-Dimension 3D Arena</p>
        </div>
        
        <div className="flex gap-4 items-center bg-gray-950/80 p-5 rounded-3xl border border-cyan-900/40 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="text-center px-6 border-r border-gray-800">
            <p className="text-[10px] text-gray-500 uppercase font-bold orbitron">Credits</p>
            <p className="text-3xl font-black text-yellow-400">₵{gameState.wallet}</p>
          </div>
          <div className="text-center px-6">
            <p className="text-[10px] text-gray-500 uppercase font-bold orbitron">Active</p>
            <p className={`text-3xl font-black tracking-widest ${gameState.currentPlayer === 'X' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'text-rose-500 animate-pulse'}`}>
              {gameState.isGameOver ? 'VOID' : gameState.currentPlayer}
            </p>
          </div>
          <button 
            onClick={resetGame}
            className="p-3 bg-gray-900 hover:bg-cyan-500 hover:text-black rounded-2xl text-cyan-400 border border-cyan-900/50 transition-all shadow-lg active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </header>

      <main className="w-full max-w-[1400px] grid grid-cols-1 xl:grid-cols-12 gap-8 items-start z-10">
        <div className="xl:col-span-8 flex flex-col md:flex-row gap-6 justify-center">
          {gameState.boards.map((board, idx) => (
            <div key={idx} className="flex-1 max-w-[440px]">
              <Board3D 
                board={board}
                boardId={idx}
                blockedCells={gameState.blockedCells[idx]}
                winningCells={gameState.winningCells[idx]}
                onCellClick={(pos) => handleCellClick(idx, pos)}
                label={BOARD_SPECS[idx].label}
              />
            </div>
          ))}
        </div>

        <div className="xl:col-span-4 flex flex-col gap-6">
          <div className="bg-gray-950/80 p-6 rounded-3xl border border-gray-800 shadow-2xl backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="orbitron text-xs font-black text-cyan-500 tracking-[0.3em] uppercase flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${aiThinking ? 'bg-rose-500 shadow-[0_0_8px_red] animate-pulse' : 'bg-cyan-500 shadow-[0_0_8px_cyan]'}`}></span> CORE_STATUS
              </h2>
            </div>

            {/* AI Calculation Loading Bar */}
            <div className={`w-full bg-gray-900 rounded-full overflow-hidden transition-all duration-300 ease-out border border-gray-800 ${aiThinking ? 'h-2 mb-6 opacity-100' : 'h-0 mb-0 opacity-0'}`}>
              <div 
                className="h-full bg-rose-500 animate-ai-progress shadow-[0_0_10px_rgba(244,63,94,0.8)]" 
                style={{ animationDuration: `${AI_THINK_TIME}ms` }}
              ></div>
            </div>

            {gameState.isGameOver ? (
              <div className="text-center py-6 bg-cyan-950/20 rounded-2xl border border-cyan-800/50 shadow-inner">
                <p className="text-4xl font-black text-yellow-400 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                  {gameState.winner === 'Draw' ? "STALEMATE" : `P_${gameState.winner} DOMINATES`}
                </p>
                <button onClick={resetGame} className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-black orbitron rounded-full transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                  RE-INITIALIZE
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 orbitron">TEST_MODE</span>
                  <button
                    onClick={() => setGameState(p => ({ ...p, isTestingMode: !p.isTestingMode }))}
                    className={`text-[10px] orbitron font-bold px-3 py-1.5 rounded-lg border transition-all ${gameState.isTestingMode ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-gray-900 text-gray-600 border-gray-800 hover:text-gray-400'}`}
                  >
                    {gameState.isTestingMode ? 'ENGAGED' : 'OFFLINE'}
                  </button>
                </div>

                <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-gray-800">
                  <span className="text-[10px] text-gray-500 orbitron">CPU_LOGIC</span>
                  <select 
                    value={gameState.difficulty}
                    onChange={(e) => setGameState(p => ({ ...p, difficulty: e.target.value as Difficulty }))}
                    className="bg-transparent border-none text-cyan-400 orbitron text-xs focus:ring-0 cursor-pointer font-bold"
                  >
                    <option value={Difficulty.EASY}>ROOKIE</option>
                    <option value={Difficulty.MEDIUM}>ELITE</option>
                    <option value={Difficulty.HARD}>GODLIKE</option>
                  </select>
                </div>
                <button 
                  onClick={undoMove}
                  disabled={gameState.history.length < 2 || gameState.wallet < UNDO_COST || aiThinking}
                  className="w-full py-4 bg-gray-900 border border-gray-800 hover:border-rose-500 disabled:opacity-20 rounded-2xl text-[10px] orbitron transition-all flex items-center justify-center gap-2 group font-black"
                >
                  QUANTUM_REWIND <span className="text-yellow-500">₵{UNDO_COST}</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-gray-950/80 p-6 rounded-3xl border border-gray-800 shadow-2xl backdrop-blur-xl">
            <h2 className="orbitron text-xs font-black mb-6 text-purple-400 tracking-[0.3em] uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_purple]"></span> MOD_SHOP
            </h2>
            <div className="space-y-2">
              {POWER_UPS.map((pu) => (
                <button
                  key={pu.type}
                  onClick={() => usePowerUp(pu.type)}
                  disabled={gameState.wallet < pu.cost || gameState.isGameOver || aiThinking}
                  className="w-full p-4 bg-gray-900 border border-gray-800 hover:border-purple-500 disabled:opacity-30 rounded-2xl flex justify-between items-center transition-all group relative overflow-hidden shadow-lg"
                >
                  <div className="text-left z-10">
                    <p className="font-black text-gray-300 group-hover:text-purple-400 text-xs orbitron">{pu.type.toUpperCase()}</p>
                    <p className="text-[8px] text-gray-500 font-bold uppercase mt-0.5">{pu.description}</p>
                  </div>
                  <span className="text-yellow-400 font-black text-sm orbitron z-10">₵{pu.cost}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-cyan-500 text-black px-10 py-3 rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.6)] animate-bounce-in z-50 orbitron text-xs font-black">
          {notification}
        </div>
      )}

      <footer className="mt-16 py-6 opacity-20 text-center">
        <p className="text-[8px] orbitron tracking-[1em] text-cyan-500 font-bold">HYPER-SPACE // V.10.2.4</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-in {
          0% { transform: translate(-50%, 50px); opacity: 0; }
          70% { transform: translate(-50%, -10px); opacity: 1; }
          100% { transform: translate(-50%, 0); }
        }
        .animate-bounce-in { animation: bounce-in 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
        
        @keyframes ai-progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-ai-progress {
          animation-name: ai-progress;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}} />
    </div>
  );
};

export default App;
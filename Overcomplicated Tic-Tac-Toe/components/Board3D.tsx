
import React, { useState } from 'react';
import { BoardState, Position, Player } from '../types';
import { CubeCell } from './CubeCell';
import { BOARD_SPECS } from '../constants';

interface Board3DProps {
  board: BoardState;
  boardId: number;
  blockedCells: Set<string>;
  winningCells: Set<string>;
  onCellClick: (pos: Position) => void;
  label: string;
}

export const Board3D: React.FC<Board3DProps> = ({ board, boardId, blockedCells, winningCells, onCellClick, label }) => {
  const [activeLayer, setActiveLayer] = useState<number | null>(null);
  
  const spec = BOARD_SPECS[boardId];
  const { cols, rows, depth } = spec;

  // Render helpers
  const getGridStyle = () => ({
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
  });

  const isToroidal = boardId === 1;

  return (
    <div className={`
      relative bg-gray-950/80 p-6 rounded-2xl border-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl overflow-hidden flex flex-col items-center group transition-all min-h-[550px]
      ${isToroidal ? 'border-purple-500/30 hover:border-purple-500/60' : 'border-gray-800 hover:border-cyan-500/30'}
    `}>
      {/* Background Glow */}
      <div className={`absolute -top-24 -left-24 w-48 h-48 blur-[100px] pointer-events-none transition-colors duration-500 ${isToroidal ? 'bg-purple-600/20' : 'bg-cyan-500/10'}`}></div>
      
      {/* Toroidal Warp Effect Overlay */}
      {isToroidal && (
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,#3b0764_100%)] z-0"></div>
      )}

      <div className="w-full flex justify-between items-center mb-10 z-20 pointer-events-auto">
        <div className="flex flex-col">
           <h3 className={`orbitron text-xs tracking-[0.4em] uppercase font-black drop-shadow-[0_0_10px_rgba(0,0,0,0.6)] ${isToroidal ? 'text-purple-400' : 'text-cyan-400'}`}>
            {label}
          </h3>
          <span className="text-[8px] text-gray-500 font-mono mt-1 flex items-center gap-2">
            {cols}x{rows}x{depth} MATRIX
            {isToroidal && <span className="text-purple-500 animate-pulse font-bold">[WARP_ACTIVE]</span>}
          </span>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setActiveLayer(prev => prev === null ? 0 : Math.max(0, prev - 1))}
            className={`p-1.5 bg-gray-900 border rounded-lg transition-all shadow-lg active:scale-90 ${isToroidal ? 'border-purple-900/50 hover:bg-purple-500 text-purple-400 hover:text-white' : 'border-cyan-900/50 hover:bg-cyan-500 text-cyan-400 hover:text-black'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            onClick={() => setActiveLayer(prev => prev === null ? depth - 1 : Math.min(depth - 1, prev + 1))}
            className={`p-1.5 bg-gray-900 border rounded-lg transition-all shadow-lg active:scale-90 ${isToroidal ? 'border-purple-900/50 hover:bg-purple-500 text-purple-400 hover:text-white' : 'border-cyan-900/50 hover:bg-cyan-500 text-cyan-400 hover:text-black'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            onClick={() => setActiveLayer(null)}
            className={`px-3 text-[10px] orbitron rounded-lg border transition-all 
              ${activeLayer === null 
                ? (isToroidal ? 'bg-purple-500 text-white border-purple-400 font-black' : 'bg-cyan-500 text-black border-cyan-400 font-black')
                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
              }`}
          >
            ALL
          </button>
        </div>
      </div>

      <div className={`relative w-64 h-[480px] perspective-1500 preserve-3d mt-2 pointer-events-none`}>
        {Array.from({ length: depth }).map((_, z) => {
          const isHidden = activeLayer !== null && activeLayer !== z;
          const isFocused = activeLayer === z;
          
          // Uniform spacing for 4x4x4
          const spacing = 90;
          const baseTop = 0; 

          return (
            <div 
              key={z} 
              className={`absolute left-0 w-full transition-all duration-500 ease-out preserve-3d
                ${isHidden ? 'opacity-5 scale-90 translate-y-10' : 'opacity-100'}
              `}
              style={{ 
                top: isFocused ? '120px' : `${baseTop + (z * spacing)}px`,
                zIndex: isFocused ? 100 : (z + 10), 
                transform: `rotateX(60deg) rotateZ(-45deg) ${isFocused ? 'scale(1.1) translateZ(80px)' : ''}`,
              }}
            >
              <div 
                className={`grid gap-1.5 p-3 rounded-xl border-2 transition-all duration-300 pointer-events-none
                ${isFocused 
                  ? (isToroidal ? 'bg-purple-500/10 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.4)]' : 'bg-cyan-400/10 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]') 
                  : 'bg-gray-900/40 border-gray-700/50 shadow-xl'}
                `}
                style={getGridStyle()}
              >
                {Array.from({ length: rows }).map((_, y) => (
                  Array.from({ length: cols }).map((_, x) => (
                    <CubeCell
                      key={`${x}-${y}-${z}`}
                      x={x} y={y} z={z}
                      value={board[x]?.[y]?.[z] || null}
                      isBlocked={blockedCells.has(`${x}-${y}-${z}`)}
                      isWinning={winningCells.has(`${x}-${y}-${z}`)}
                      onClick={() => onCellClick({ x, y, z })}
                    />
                  ))
                ))}
              </div>
              <div className={`absolute -left-14 top-1/2 -translate-y-1/2 -rotate-x-90 text-[12px] orbitron font-black transition-all
                ${isFocused 
                  ? (isToroidal ? 'text-purple-400 opacity-100' : 'text-cyan-400 opacity-100') 
                  : (isToroidal ? 'text-purple-800 opacity-40' : 'text-cyan-700 opacity-40')}
              `}>
                LVL_{z+1}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 text-center pb-4 z-20 pointer-events-none">
        <p className="text-[10px] text-gray-500 orbitron tracking-[0.3em] font-bold">
          {activeLayer === null ? "MULTI-PLANE VIEW" : `PLANE_0${activeLayer + 1}_FOCUS`}
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1500 { perspective: 1500px; }
        .preserve-3d { transform-style: preserve-3d; }
      `}} />
    </div>
  );
};

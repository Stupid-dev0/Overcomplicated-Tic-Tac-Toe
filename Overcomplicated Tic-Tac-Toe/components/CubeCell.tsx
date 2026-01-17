
import React from 'react';
import { Player } from '../types';

interface CubeCellProps {
  value: Player;
  isBlocked: boolean;
  isWinning?: boolean;
  onClick: () => void;
  x: number;
  y: number;
  z: number;
}

export const CubeCell: React.FC<CubeCellProps> = ({ value, isBlocked, isWinning, onClick, x, y, z }) => {
  return (
    <div className="relative w-11 h-11 pointer-events-auto">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        disabled={isBlocked || !!value}
        className={`
          w-full h-full border transition-all duration-300 flex items-center justify-center text-2xl font-black rounded-sm relative
          ${isWinning ? 'bg-yellow-500/40 border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.8)] z-50 animate-pulse' : ''}
          ${!isWinning && isBlocked ? 'bg-red-900/50 border-red-500 cursor-not-allowed shadow-[inset_0_0_8px_rgba(239,68,68,0.5)]' : ''}
          ${!isWinning && !isBlocked ? 'bg-black/40 border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.8)] hover:z-50' : ''}
          
          ${!isWinning && value === 'X' ? 'text-cyan-400 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)] bg-cyan-900/20' : ''}
          ${!isWinning && value === 'O' ? 'text-rose-500 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)] bg-rose-900/20' : ''}
          ${isWinning && value ? 'text-yellow-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}
          ${!value && !isBlocked && !isWinning ? 'text-transparent' : ''}
        `}
        title={`Pos: ${x},${y},${z}`}
      >
        {/* Visual Marker with 3D correction rotation */}
        <span className="transform rotate-z-45 rotate-x--60 scale-125 block drop-shadow-[0_0_8px_currentColor]">
          {value}
        </span>
        
        {isBlocked && !isWinning && <span className="text-red-500 text-[10px] animate-pulse font-black absolute">LOCKED</span>}
        
        {/* Corner coordinate hint */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none flex items-end justify-end p-0.5 text-[6px] text-cyan-300 font-mono">
          {x}{y}
        </div>
      </button>
    </div>
  );
};

import React, { useState } from 'react';
import { DeckIcon as DeckIconComponent } from './DeckIcon';
import { motion } from 'framer-motion';

interface Position {
  x: number; // 0 to 100
  y: number; // 0 to 100
}

interface DistributionGraphProps {
  deckIds: string[];
  allDecks: Record<string, { bgCard: string, subCard: string }>;
  positions: Record<string, Position>;
  xAxisLabel: string;
  yAxisLabel: string;
  onPositionChange: (id: string, pos: Position) => void;
  onLabelsChange: (x: string, y: string) => void;
}

export const DistributionGraph: React.FC<DistributionGraphProps> = ({ 
  deckIds, 
  allDecks, 
  positions, 
  xAxisLabel, 
  yAxisLabel,
  onPositionChange,
  onLabelsChange
}) => {
  const [isDragging, setIsDragging] = useState<string | null>(null);

  const handleDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    // Basic drag logic (simplified for this component)
    // In a real app, I'd use a library or a hook
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">横軸 (X)</label>
          <input 
            type="text" 
            value={xAxisLabel}
            onChange={(e) => onLabelsChange(e.target.value, yAxisLabel)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">縦軸 (Y)</label>
          <input 
            type="text" 
            value={yAxisLabel}
            onChange={(e) => onLabelsChange(xAxisLabel, e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div className="relative aspect-square w-full max-w-2xl mx-auto glass-dark border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Grid lines */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-full border-t border-white/5 border-dashed"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-full border-l border-white/5 border-dashed"></div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-slate-500 font-bold text-sm bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-md border border-white/5">{yAxisLabel} (高)</div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-slate-500 font-bold text-sm bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-md border border-white/5">{yAxisLabel} (低)</div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-md border border-white/5 rotate-90">{xAxisLabel} (高)</div>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-md border border-white/5 -rotate-90">{xAxisLabel} (低)</div>

        {/* Icons Area */}
        <div className="absolute inset-12">
          {deckIds.map(id => {
            const pos = positions[id] || { x: 50, y: 50 };
            return (
              <motion.div
                key={id}
                drag
                dragMomentum={false}
                dragConstraints={{ left: 0, top: 0, right: 100, bottom: 100 }} // Note: dragConstraints usually in px, I'd need a ref
                layout
                className="absolute"
                style={{ 
                  left: `${pos.x}%`, 
                  top: `${100 - pos.y}%`,
                  transform: 'translate(-50%, -50%)' 
                }}
                onDragEnd={(_, info) => {
                  // Simplified coordinate conversion logic would go here
                }}
              >
                <DeckIconComponent bgCard={allDecks[id].bgCard} subCard={allDecks[id].subCard} size="md" className="cursor-grab active:cursor-grabbing shadow-xl" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { DeckIcon } from './DeckIcon';

import { motion } from 'framer-motion';

interface TierRowProps {
  label: string;
  color: string;
  deckIds: string[];
  allDecks: Record<string, { bgCard: string, subCard: string }>;
  onAddDeck?: () => void;
  onRemoveDeck?: (deckId: string) => void;
}

export const TierRow: React.FC<TierRowProps> = ({ label, color, deckIds, allDecks, onRemoveDeck }) => {
  return (
    <div className="flex bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden min-h-[100px] group">
      {/* Label section */}
      <div 
        className="w-24 md:w-32 flex flex-col items-center justify-center gap-1 shrink-0 p-4"
        style={{ backgroundColor: `${color}20`, borderRight: `2px solid ${color}` }}
      >
        <span className="text-2xl font-black italic tracking-tighter" style={{ color }}>{label}</span>
      </div>

      {/* Decks section */}
      <div className="flex-1 flex flex-wrap gap-3 p-4 items-center">
        {deckIds.map(id => {
          const deck = allDecks[id];
          if (!deck) return null;
          return (
            <motion.div 
              layout
              key={id} 
              className="relative group/icon"
            >
              <DeckIcon bgCard={deck.bgCard} subCard={deck.subCard} size="md" />
              {onRemoveDeck && (
                <button 
                  onClick={() => onRemoveDeck(id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={14} />
                </button>
              )}
            </motion.div>
          );
        })}
        
        {deckIds.length === 0 && (
          <div className="text-slate-600 text-sm font-medium italic">ドラッグして配置</div>
        )}
      </div>
    </div>
  );
};

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);

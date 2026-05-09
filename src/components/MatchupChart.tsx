import React from 'react';
import { DeckIcon } from './DeckIcon';


type MatchupType = 'win' | 'small-win' | 'even' | 'small-lose' | 'lose';

interface MatchupChartProps {
  deckIds: string[];
  allDecks: Record<string, { bgCard: string, subCard: string }>;
  matchups: Record<string, Record<string, MatchupType>>;
  onChange: (id1: string, id2: string, type: MatchupType) => void;
}

export const MatchupChart: React.FC<MatchupChartProps> = ({ deckIds, allDecks, matchups, onChange }) => {
  const getMatchupColor = (type: MatchupType) => {
    switch (type) {
      case 'win': return 'bg-blue-500';
      case 'small-win': return 'bg-blue-400/50';
      case 'even': return 'bg-slate-700';
      case 'small-lose': return 'bg-red-400/50';
      case 'lose': return 'bg-red-500';
      default: return 'bg-slate-800';
    }
  };

  const getMatchupLabel = (type: MatchupType) => {
    switch (type) {
      case 'win': return '有利';
      case 'small-win': return '微有利';
      case 'even': return '互角';
      case 'small-lose': return '微不利';
      case 'lose': return '不利';
      default: return '-';
    }
  };

  const cycleMatchup = (id1: string, id2: string) => {
    const current = matchups[id1]?.[id2] || 'even';
    const sequence: MatchupType[] = ['even', 'small-win', 'win', 'small-lose', 'lose'];
    const nextIndex = (sequence.indexOf(current) + 1) % sequence.length;
    onChange(id1, id2, sequence[nextIndex]);
  };

  return (
    <div className="overflow-x-auto glass-dark rounded-3xl border border-white/10 p-6">
      <table className="border-separate border-spacing-2">
        <thead>
          <tr>
            <th className="w-16 h-16"></th>
            {deckIds.map(id => (
              <th key={id} className="p-1">
                <DeckIcon bgCard={allDecks[id].bgCard} subCard={allDecks[id].subCard} size="sm" className="mx-auto shadow-none" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deckIds.map(id1 => (
            <tr key={id1}>
              <td className="p-1">
                <DeckIcon bgCard={allDecks[id1].bgCard} subCard={allDecks[id1].subCard} size="sm" className="mx-auto shadow-none" />
              </td>
              {deckIds.map(id2 => {
                const type = matchups[id1]?.[id2] || 'even';
                const isDiagonal = id1 === id2;
                
                return (
                  <td key={id2} className="p-0">
                    <button
                      disabled={isDiagonal}
                      onClick={() => cycleMatchup(id1, id2)}
                      className={`
                        w-16 h-12 rounded-lg flex items-center justify-center text-[10px] font-bold text-white transition-all
                        ${isDiagonal ? 'bg-slate-900 opacity-20' : getMatchupColor(type)}
                        ${!isDiagonal && 'hover:brightness-125 hover:scale-105 active:scale-95 shadow-lg shadow-black/20'}
                      `}
                    >
                      {!isDiagonal && getMatchupLabel(type)}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

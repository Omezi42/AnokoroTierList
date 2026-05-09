import React from 'react';
import { getImagePath } from '../lib/cards';
import { cn } from '../lib/utils';

interface DeckIconProps {
  bgCard: string;
  subCard?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const DeckIcon: React.FC<DeckIconProps> = ({ bgCard, subCard, size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  return (
    <div className={cn(
      "relative rounded-lg overflow-hidden shadow-md bg-slate-800 flex-shrink-0 group",
      sizeClasses[size],
      className
    )}>
      {/* Background Card */}
      <img 
        src={getImagePath(bgCard, 'background')} 
        alt={bgCard}
        className="w-full h-full object-cover transition-transform group-hover:scale-110"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/1e293b/475569?text=?';
        }}
      />
      
      {/* Sub Card (Overlaid) */}
      {subCard && (
        <div className="absolute -bottom-1 -right-1 w-[85%] h-[85%] transition-transform group-hover:scale-105">
           <img 
            src={getImagePath(subCard, 'sub')} 
            alt={subCard}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
};

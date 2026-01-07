
import React from 'react';
import { Choice } from '../types';

interface ControlsProps {
  choices: Choice[];
  onChoiceSelect: (choice: Choice) => void;
  disabled: boolean;
  inventory: string[];
  selectedChoiceId: string | null;
}

const Controls: React.FC<ControlsProps> = ({ choices, onChoiceSelect, disabled, inventory, selectedChoiceId }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-6">
      {choices.length > 0 ? (
        choices.map((choice) => {
          const isLocked = choice.requiredItem && !inventory.includes(choice.requiredItem);
          const isSelected = selectedChoiceId === choice.id;
          const isUnsafe = choice.isUnsafe;
          const hasRequiredItem = choice.requiredItem && inventory.includes(choice.requiredItem);
          
          return (
            <button
              key={choice.id}
              onClick={() => !isLocked && onChoiceSelect(choice)}
              disabled={disabled || isLocked}
              className={`
                p-5 text-left border-4 rounded-lg font-mono text-xl md:text-2xl
                transition-all duration-150 relative overflow-hidden group
                min-h-[90px] flex items-center
                ${disabled && !isSelected
                  ? 'opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-500 border-zinc-700' 
                  : isLocked
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-700 cursor-not-allowed grayscale opacity-60'
                  : isSelected
                  ? 'border-white text-white z-20 scale-95 shadow-inner animate-select-flash'
                  : hasRequiredItem
                  ? 'bg-zinc-900 border-yellow-700/50 text-yellow-500 hover:border-yellow-400 hover:text-yellow-400 shadow-[4px_4px_0px_0px_#422006]'
                  : isUnsafe
                  ? 'bg-zinc-900 border-red-900/40 text-red-400 hover:border-red-500 hover:text-red-500 unsafe-glow shadow-[4px_4px_0px_0px_#450a0a]'
                  : 'hover:border-green-500 hover:text-green-500 bg-zinc-900 border-zinc-700 shadow-[4px_4px_0px_0px_#000] active:shadow-none'
                }
                ${isSelected && isUnsafe && !hasRequiredItem ? 'animate-shake' : ''}
              `}
            >
              {hasRequiredItem && !isSelected && (
                <div className="absolute top-1 right-2 text-[10px] font-bold text-yellow-600 uppercase tracking-tighter">
                  [UTILISER {choice.requiredItem}]
                </div>
              )}
              
              {isUnsafe && !hasRequiredItem && !isLocked && (
                <div className="absolute top-1 right-2 text-[10px] font-bold text-red-500/60 group-hover:text-red-500 transition-colors animate-pulse">
                  [RISQUÉ]
                </div>
              )}

              <span className={`mr-3 shrink-0 transition-transform ${isSelected ? 'scale-125' : ''}`}>
                {isLocked ? '🔒' : hasRequiredItem ? '⚡ ' : isUnsafe ? '☠ ' : '> '}
              </span>
              
              <div className="flex flex-col">
                <span className={`leading-tight transition-all ${isLocked ? 'line-through opacity-40' : ''} ${isSelected ? 'tracking-wider font-bold' : ''}`}>
                  {choice.label}
                </span>
                {isLocked && (
                  <span className="text-[10px] text-red-900 uppercase font-bold mt-1">
                    Requis: {choice.requiredItem}
                  </span>
                )}
                {hasRequiredItem && !isSelected && (
                  <span className="text-[10px] text-yellow-700 uppercase mt-1 tracking-tighter">
                    Succès Garanti via {choice.requiredItem}
                  </span>
                )}
                {isUnsafe && !hasRequiredItem && !isLocked && !isSelected && (
                  <span className="text-[10px] opacity-40 uppercase mt-1 tracking-tighter">
                    Action critique - Roll requis
                  </span>
                )}
              </div>

              {isSelected && (
                <div className="absolute bottom-0 left-0 h-1 bg-white w-full animate-pulse"></div>
              )}
            </button>
          );
        })
      ) : (
        <div className="col-span-2 text-center text-zinc-500 font-mono py-6 text-xl animate-pulse">
           SYNCHRONISATION...
        </div>
      )}
    </div>
  );
};

export default Controls;

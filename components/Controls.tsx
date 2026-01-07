
import React from 'react';
import { Choice } from '../types';

interface ControlsProps {
  choices: Choice[];
  onChoiceSelect: (choice: Choice) => void;
  disabled: boolean;
}

const Controls: React.FC<ControlsProps> = ({ choices, onChoiceSelect, disabled }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-6">
      {choices.length > 0 ? (
        choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => onChoiceSelect(choice)}
            disabled={disabled}
            className={`
              p-5 text-left border-4 border-zinc-700 rounded-lg font-mono text-xl md:text-2xl
              transition-all duration-150 active:translate-y-1 active:bg-zinc-800
              min-h-[70px] flex items-center
              ${disabled 
                ? 'opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-500' 
                : 'hover:border-green-500 hover:text-green-500 bg-zinc-900 shadow-[4px_4px_0px_0px_#000] active:shadow-none'
              }
            `}
          >
            <span className="text-zinc-500 mr-3 shrink-0">{`> `}</span>
            <span className="leading-tight">{choice.label}</span>
          </button>
        ))
      ) : (
        <div className="col-span-2 text-center text-zinc-500 font-mono py-6 text-xl animate-pulse">
           INITIALISATION DES CHOIX...
        </div>
      )}
    </div>
  );
};

export default Controls;

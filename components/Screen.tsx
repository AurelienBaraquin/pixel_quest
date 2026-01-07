
import React, { useState, useEffect } from 'react';
import { StoryNode } from '../types';

interface ScreenProps {
  scene: StoryNode | null;
  imageUrl: string | null;
  loading: boolean;
  typingSpeed?: number;
}

const Screen: React.FC<ScreenProps> = ({ scene, imageUrl, loading, typingSpeed = 20 }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (scene?.texte) {
      setDisplayedText("");
      setIndex(0);
    }
  }, [scene?.texte]);

  useEffect(() => {
    if (scene?.texte && index < scene.texte.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + scene.texte[index]);
        setIndex(prev => prev + 1);
      }, typingSpeed);
      return () => clearTimeout(timeout);
    }
  }, [scene?.texte, index, typingSpeed]);

  return (
    <div className="relative w-full min-h-[500px] bg-zinc-900 border-4 border-zinc-700 rounded-lg overflow-hidden flex flex-col shadow-inner">
      {/* CRT Effects */}
      <div className="crt-overlay absolute inset-0 pointer-events-none"></div>
      <div className="scanline absolute inset-0 pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10 p-4 md:p-6 h-full flex flex-col gap-4">
        {/* Image Display - Slightly smaller relative height to favor text */}
        <div className="w-full aspect-video md:aspect-[16/9] bg-black rounded border-2 border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
          {loading ? (
            <div className="animate-pulse text-zinc-500 text-xl md:text-2xl uppercase tracking-widest">
              Génération...
            </div>
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Scene Illustration" 
              className="w-full h-full object-cover mix-blend-screen brightness-125 contrast-150 grayscale"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="text-zinc-700 text-lg uppercase tracking-widest">Système Prêt.</div>
          )}
        </div>

        {/* Story Text - Taller and larger for mobile comfort */}
        <div className="flex-1 overflow-y-auto font-mono text-xl md:text-2xl leading-relaxed text-green-400 min-h-[200px] scroll-smooth">
          {!scene && !loading && (
            <div className="h-full flex items-center justify-center text-center opacity-50 px-4">
              COMMANDE : VEUILLEZ SÉLECTIONNER UN UNIVERS POUR INITIALISER LA CONSOLE.
            </div>
          )}
          {scene && (
            <p className="pb-4">
              {displayedText}
              {index < scene.texte.length && <span className="animate-pulse bg-green-400 inline-block w-3 h-6 ml-1 align-middle"></span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Screen;

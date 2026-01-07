
import React, { useState, useEffect } from 'react';
import { StoryNode } from '../types';

interface ScreenProps {
  scene: StoryNode | null;
  imageUrl: string | null;
  loading: boolean;
  isRolling: boolean;
  currentRoll: number | null;
  isFromCache: boolean;
  inventory: string[];
  health: number;
  consumedItem: string | null;
  typingSpeed?: number;
  fullInventoryWarning?: string | null;
}

const Screen: React.FC<ScreenProps> = ({ 
  scene, 
  imageUrl, 
  loading, 
  isRolling, 
  currentRoll, 
  isFromCache, 
  inventory, 
  health, 
  consumedItem, 
  typingSpeed = 20,
  fullInventoryWarning 
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const [showItemNotif, setShowItemNotif] = useState<{name: string, type: 'gain' | 'loss' | 'heal' | 'damage' | 'discard'} | null>(null);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (scene?.texte) {
      setDisplayedText("");
      setIndex(0);
    }
    if (scene?.itemGained) {
      setShowItemNotif({ name: scene.itemGained, type: 'gain' });
      const timer = setTimeout(() => setShowItemNotif(null), 3000);
      return () => clearTimeout(timer);
    }
    if (scene?.healthChange) {
      const type = scene.healthChange > 0 ? 'heal' : 'damage';
      setShowItemNotif({ name: `${Math.abs(scene.healthChange)} PV`, type });
      if (type === 'damage') setShowFlash(true);
      const timer = setTimeout(() => {
        setShowItemNotif(null);
        setShowFlash(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [scene?.texte, scene?.itemGained, scene?.healthChange]);

  useEffect(() => {
    if (consumedItem) {
      setShowItemNotif({ name: consumedItem, type: 'loss' });
      setShowFlash(true);
      const timerNotif = setTimeout(() => setShowItemNotif(null), 3000);
      const timerFlash = setTimeout(() => setShowFlash(false), 600);
      return () => {
        clearTimeout(timerNotif);
        clearTimeout(timerFlash);
      };
    }
  }, [consumedItem]);

  useEffect(() => {
    if (fullInventoryWarning) {
      setShowItemNotif({ name: fullInventoryWarning, type: 'discard' });
      const timer = setTimeout(() => setShowItemNotif(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [fullInventoryWarning]);

  useEffect(() => {
    if (scene?.texte && index < scene.texte.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + scene.texte[index]);
        setIndex(prev => prev + 1);
      }, typingSpeed);
      return () => clearTimeout(timeout);
    }
  }, [scene?.texte, index, typingSpeed]);

  const isGameOver = scene?.isGameOver || health <= 0;
  const isHealthCritical = health === 1;

  // Max slots logic for display
  const totalSlots = 6;
  const slots = Array.from({ length: totalSlots }).map((_, i) => inventory[i] || null);

  return (
    <div className={`relative w-full min-h-[500px] border-4 rounded-lg overflow-hidden flex flex-col shadow-inner transition-colors duration-500 ${isGameOver ? 'bg-red-950 border-red-600' : 'bg-zinc-900 border-zinc-700'}`}>
      <div className={`crt-overlay absolute inset-0 pointer-events-none ${isGameOver ? 'opacity-40' : ''}`}></div>
      <div className={`scanline absolute inset-0 pointer-events-none ${isGameOver ? 'bg-gradient-to-t from-red-500/20 to-transparent' : ''}`}></div>
      
      {showFlash && (
        <div className={`absolute inset-0 z-[100] animate-item-flash pointer-events-none ${scene?.healthChange && scene.healthChange < 0 ? 'bg-red-600/50' : 'bg-white'}`}></div>
      )}

      <div className="relative z-10 p-4 md:p-6 h-full flex flex-col gap-4">
        
        {/* Status Hub */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-zinc-800 pb-4 mb-2 font-mono text-sm">
          {/* Health Section */}
          <div className="flex flex-col gap-2">
            <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Biosignaux :</span>
            <div className="flex items-center gap-3 bg-zinc-950 p-2 rounded border border-zinc-800">
              <div className="flex gap-1">
                {[...Array(3)].map((_, i) => (
                  <span key={i} className={`text-2xl transition-all duration-500 ${i < health ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-zinc-800 opacity-30'} ${isHealthCritical && i < health ? 'animate-heart-pulse' : ''}`}>
                    {i < health ? '❤' : '❤'}
                  </span>
                ))}
              </div>
              <div className="flex flex-col ml-2 leading-none">
                <span className={`text-[12px] font-bold ${health <= 1 ? 'text-red-500' : 'text-zinc-400'}`}>
                  {health === 3 ? 'STABLE' : health === 2 ? 'FAIBLE' : health === 1 ? 'CRITIQUE' : 'NUL'}
                </span>
                <span className="text-[9px] text-zinc-600 uppercase">Status Global</span>
              </div>
            </div>
          </div>

          {/* Inventory Section (2x3 grid) */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Inventaire ({inventory.length}/6) :</span>
              {inventory.length === 6 && <span className="text-red-900 text-[10px] font-bold animate-pulse">PLEIN</span>}
            </div>
            <div className="grid grid-cols-3 gap-1 h-full">
              {slots.map((item, idx) => (
                <div key={idx} className={`
                  h-10 flex items-center justify-center border text-[9px] text-center p-1 uppercase transition-all overflow-hidden leading-none
                  ${item 
                    ? item === consumedItem 
                      ? 'animate-inventory-glow border-yellow-400 text-yellow-400 bg-zinc-800' 
                      : 'bg-zinc-800 border-zinc-700 text-green-500 shadow-inner'
                    : 'bg-zinc-900/50 border-zinc-800 border-dashed text-zinc-800 opacity-40'
                  }
                `}>
                  {item ? item : '...'}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center font-mono text-xs uppercase tracking-widest text-zinc-500">
          <span>{isGameOver ? '!!! FAILURE_CODE_404 !!!' : `SESSION_${(scene?.texte.length || 0).toString(16).toUpperCase()}`}</span>
          <div className="flex items-center gap-2">
            {isFromCache && <span className="text-green-600 border border-green-900 px-1 text-[9px]">[MEMO_CACHE]</span>}
            {isRolling && <span className="text-yellow-500 animate-bounce">[RAND_CALC]</span>}
            {currentRoll && !isRolling && <span className="text-white bg-zinc-800 px-2 border border-zinc-600">ROLL: {currentRoll}/5</span>}
          </div>
        </div>

        <div className={`relative w-full aspect-video md:aspect-[16/9] bg-black rounded border-2 flex items-center justify-center overflow-hidden shrink-0 transition-colors ${isGameOver ? 'border-red-800' : 'border-zinc-800'}`}>
          {loading || isRolling ? (
            <div className="flex flex-col items-center gap-2">
               <div className="w-12 h-12 border-4 border-zinc-700 border-t-green-500 rounded-full animate-spin"></div>
               <div className="text-zinc-500 text-sm uppercase tracking-widest text-center">
                {isRolling ? 'Collision de probabilités...' : consumedItem ? `Usage tactique de ${consumedItem}...` : 'Chargement de la réalité...'}
               </div>
            </div>
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Scene" 
              className={`w-full h-full object-cover mix-blend-screen contrast-150 grayscale ${isGameOver ? 'brightness-50 sepia-[0.8] sepia-red' : 'brightness-125'}`}
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="text-zinc-700 text-lg uppercase tracking-widest font-mono">Console Idle.</div>
          )}
          
          {showItemNotif && (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 font-mono font-bold text-sm shadow-lg animate-bounce uppercase z-50 ${
              showItemNotif.type === 'gain' ? 'bg-green-500 text-black' : 
              showItemNotif.type === 'heal' ? 'bg-blue-500 text-white' :
              showItemNotif.type === 'damage' ? 'bg-red-600 text-white' :
              showItemNotif.type === 'discard' ? 'bg-zinc-900 border-2 border-red-600 text-red-500' :
              'bg-yellow-400 text-black'}`}>
              {showItemNotif.type === 'gain' ? 'OBJET OBTENU' : 
               showItemNotif.type === 'heal' ? 'RÉCUPÉRATION' :
               showItemNotif.type === 'damage' ? 'DÉGÂTS CRITIQUES' : 
               showItemNotif.type === 'discard' ? 'INVENTAIRE PLEIN : PERDU' :
               'ACTIVATION'} : {showItemNotif.name}
            </div>
          )}

          {isGameOver && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
                <div className="flex flex-col items-center">
                  <div className="text-red-500 text-4xl md:text-7xl font-bold tracking-tighter uppercase animate-pulse mb-2" style={{ textShadow: '0 0 20px red' }}>
                    FIN DE SESSION
                  </div>
                  <div className="text-red-900 font-mono text-sm uppercase bg-black px-2">Echec des fonctions vitales</div>
                </div>
            </div>
          )}
        </div>

        <div className={`flex-1 overflow-y-auto font-mono text-xl md:text-2xl leading-relaxed min-h-[200px] scroll-smooth ${isGameOver ? 'text-red-400' : 'text-green-400'}`}>
          {(scene || isRolling) ? (
            <p className="pb-4">
              {displayedText}
              {index < (scene?.texte.length || 0) && <span className={`animate-pulse inline-block w-3 h-6 ml-1 align-middle ${isGameOver ? 'bg-red-500' : 'bg-green-400'}`}></span>}
            </p>
          ) : (
            <div className="h-full flex items-center justify-center text-center opacity-50 px-4">
               -- EN ATTENTE D'ENTRÉE UTILISATEUR --
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Screen;

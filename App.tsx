
import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Theme, StoryNode, Choice } from './types';
import { fetchStoryNode, generateSceneImage } from './geminiService';
import Screen from './components/Screen';
import Controls from './components/Controls';

const SAVE_KEY = "pixelquest_save_state_v3";
const MAX_INVENTORY_SLOTS = 6;

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    currentScene: null,
    history: [],
    inventory: [],
    health: 3,
    isLoading: false,
    isRolling: false,
    currentRoll: null,
    currentImageUrl: null,
    theme: "",
    isFromCache: false
  });

  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [consumedItem, setConsumedItem] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);
  const [fullInventoryWarning, setFullInventoryWarning] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) setHasSave(true);
  }, []);

  const saveGame = () => {
    const dataToSave = {
      currentScene: state.currentScene,
      history: state.history,
      inventory: state.inventory,
      health: state.health,
      theme: state.theme,
      currentImageUrl: state.currentImageUrl
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(dataToSave));
    setSaveStatus("SAVED");
    setHasSave(true);
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const loadGame = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState(prev => ({
          ...prev,
          currentScene: parsed.currentScene,
          history: parsed.history,
          inventory: parsed.inventory,
          health: parsed.health ?? 3,
          theme: parsed.theme,
          currentImageUrl: parsed.currentImageUrl,
          isLoading: false,
          isRolling: false,
          currentRoll: null
        }));
        setSaveStatus("LOADED");
        setTimeout(() => setSaveStatus(null), 2000);
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  };

  const startGame = useCallback(async (selectedTheme: string) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      theme: selectedTheme, 
      history: [], 
      inventory: [],
      health: 3,
      isFromCache: false, 
      currentRoll: null 
    }));
    setConsumedItem(null);
    setFullInventoryWarning(null);
    try {
      const { node, fromCache } = await fetchStoryNode("Commence l'aventure", selectedTheme, "", [], null, null, 3);
      const imageUrl = await generateSceneImage(node.image_prompt);
      
      setState(prev => ({
        ...prev,
        currentScene: node,
        currentImageUrl: imageUrl,
        isLoading: false,
        isFromCache: fromCache,
        inventory: node.itemGained ? [node.itemGained] : []
      }));
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleChoice = useCallback(async (choice: Choice) => {
    if (!state.currentScene || state.isLoading || state.isRolling || state.health <= 0) return;

    const currentScene = state.currentScene;
    let rollResult: number | null = null;
    let itemToUse: string | null = null;
    let localHealth = state.health;

    setSelectedChoiceId(choice.id);

    if (choice.requiredItem && state.inventory.includes(choice.requiredItem)) {
      itemToUse = choice.requiredItem;
      setConsumedItem(itemToUse);
      setState(prev => ({ ...prev, isLoading: true }));
      await new Promise(r => setTimeout(r, 1200));
    } else if (choice.isUnsafe) {
      setState(prev => ({ ...prev, isRolling: true, currentRoll: null }));
      await new Promise(r => setTimeout(r, 1500));
      rollResult = Math.floor(Math.random() * 5) + 1;
      
      if (rollResult === 1) {
        localHealth -= 1;
      }
    }

    setState(prev => ({ ...prev, isRolling: false, isLoading: true, currentRoll: rollResult, health: localHealth }));

    try {
      const historyContext = state.history.slice(-3).map(h => `Action: ${h.choice} -> ${h.scene.texte}`).join(" | ");
      const tempInventory = itemToUse ? state.inventory.filter(i => i !== itemToUse) : state.inventory;

      const { node, fromCache } = await fetchStoryNode(
        choice.label, 
        state.theme, 
        historyContext, 
        tempInventory, 
        rollResult, 
        itemToUse,
        localHealth
      );
      
      const imageUrl = await generateSceneImage(node.image_prompt);

      setState(prev => {
        let newInventory = itemToUse ? prev.inventory.filter(i => i !== itemToUse) : [...prev.inventory];
        
        // Handle inventory limit
        if (node.itemGained && !newInventory.includes(node.itemGained)) {
          if (newInventory.length < MAX_INVENTORY_SLOTS) {
            newInventory.push(node.itemGained);
            setFullInventoryWarning(null);
          } else {
            // Inventory full, item discarded
            setFullInventoryWarning(node.itemGained);
            setTimeout(() => setFullInventoryWarning(null), 4000);
          }
        }

        // Apply health change from the node
        let finalHealth = prev.health + (node.healthChange || 0);
        finalHealth = Math.min(3, Math.max(0, finalHealth));

        return {
          ...prev,
          currentScene: node,
          currentImageUrl: imageUrl,
          isLoading: false,
          isFromCache: fromCache,
          inventory: newInventory,
          health: finalHealth,
          history: [...prev.history, { scene: currentScene, choice: choice.label, roll: rollResult ?? undefined }]
        };
      });
      
      setSelectedChoiceId(null);
      setConsumedItem(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, isLoading: false }));
      setSelectedChoiceId(null);
      setConsumedItem(null);
    }
  }, [state]);

  const reset = () => {
    setState({
      currentScene: null,
      history: [],
      inventory: [],
      health: 3,
      isLoading: false,
      isRolling: false,
      currentRoll: null,
      currentImageUrl: null,
      theme: "",
      isFromCache: false
    });
    setSelectedChoiceId(null);
    setConsumedItem(null);
    setFullInventoryWarning(null);
  };

  const isGameOver = state.currentScene?.isGameOver || state.health <= 0;

  return (
    <div className="w-full min-h-screen flex flex-col items-center p-2 md:p-6 pb-20">
      <header className="mb-6 md:mb-10 text-center w-full relative">
        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter text-zinc-200 uppercase transition-all duration-700" 
            style={{ 
              textShadow: isGameOver ? '4px 4px 0px #7f1d1d' : '3px 3px 0px #000, 6px 6px 0px rgba(51, 255, 51, 0.2)',
              color: isGameOver ? '#ef4444' : '#e4e4e7'
            }}>
          PIXEL QUEST
        </h1>
        <p className="text-green-500 font-mono mt-1 tracking-widest text-sm md:text-lg opacity-60 uppercase">
          Narrative Engine v4.6.0 // Advanced Inventory Active
        </p>

        {saveStatus && (
          <div className="absolute top-0 right-0 md:right-10 bg-white text-black px-4 py-1 font-mono font-bold animate-pulse text-sm z-50">
            [DATA_{saveStatus}]
          </div>
        )}
      </header>

      <div className={`w-full max-w-4xl p-3 md:p-8 rounded-xl md:rounded-2xl shadow-2xl border-b-4 md:border-b-8 border-r-4 md:border-r-8 transition-colors duration-500 ${isGameOver ? 'bg-red-900/20 border-red-900' : 'bg-zinc-800 border-black'}`}>
        
        {!state.currentScene && !state.isLoading && (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="col-span-full text-zinc-400 font-mono mb-2 text-center text-lg md:text-xl uppercase">
                -- NOUVELLE AVENTURE --
              </div>
              {Object.entries(Theme).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => startGame(value)}
                  className="p-4 md:p-6 bg-zinc-900 border-4 border-zinc-700 rounded-lg font-mono text-xl md:text-2xl text-green-500 hover:border-green-500 hover:bg-zinc-800 transition-all active:scale-95 text-center shadow-[4px_4px_0px_0px_#000]"
                >
                  {value}
                </button>
              ))}
            </div>

            {hasSave && (
              <div className="flex flex-col items-center gap-4 border-t-2 border-zinc-700 pt-8">
                <button
                  onClick={loadGame}
                  className="w-full max-w-sm p-4 md:p-6 bg-green-950/20 border-4 border-green-500/50 rounded-lg font-mono text-xl md:text-2xl text-green-400 hover:bg-green-500 hover:text-black transition-all active:scale-95 text-center shadow-[4px_4px_0px_0px_#052e16] group"
                >
                  <span className="group-hover:animate-pulse">CONTINUER LA SESSION</span>
                </button>
              </div>
            )}
          </div>
        )}

        <Screen 
          scene={state.currentScene} 
          imageUrl={state.currentImageUrl} 
          loading={state.isLoading} 
          isRolling={state.isRolling}
          currentRoll={state.currentRoll}
          isFromCache={state.isFromCache}
          inventory={state.inventory}
          health={state.health}
          consumedItem={consumedItem}
          fullInventoryWarning={fullInventoryWarning}
        />

        {state.currentScene && !isGameOver && (
          <>
            <Controls 
              choices={state.currentScene.choix} 
              onChoiceSelect={handleChoice} 
              disabled={state.isLoading || state.isRolling} 
              inventory={state.inventory}
              selectedChoiceId={selectedChoiceId}
            />
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              <button 
                onClick={saveGame}
                disabled={state.isLoading || state.isRolling}
                className="p-3 bg-zinc-900 border-2 border-zinc-600 text-zinc-400 font-mono uppercase text-sm hover:border-green-500 hover:text-green-500 transition-all"
              >
                [ SAVE_STATE ]
              </button>
              <button 
                onClick={loadGame}
                disabled={state.isLoading || state.isRolling || !hasSave}
                className="p-3 bg-zinc-900 border-2 border-zinc-600 text-zinc-400 font-mono uppercase text-sm hover:border-yellow-500 hover:text-yellow-500 transition-all"
              >
                [ LOAD_CHECKPOINT ]
              </button>
            </div>
          </>
        )}

        {isGameOver && !state.isLoading && (
          <div className="mt-8 flex flex-col items-center gap-6 p-6 border-4 border-red-600 bg-red-950/40 rounded-xl">
              <p className="font-mono text-red-500 text-center text-xl uppercase tracking-widest">SIGNAL VITAUX : NULS</p>
              <div className="flex flex-col md:flex-row gap-4 w-full justify-center">
                <button 
                  onClick={reset}
                  className="px-12 py-6 bg-red-600 text-black font-mono text-3xl font-bold uppercase hover:bg-red-500 active:scale-95 transition-all shadow-[6px_6px_0px_0px_#450a0a]"
                >
                  REBOOT SYSTEM
                </button>
                {hasSave && (
                  <button 
                    onClick={loadGame}
                    className="px-8 py-6 bg-zinc-900 border-4 border-zinc-700 text-green-500 font-mono text-xl uppercase hover:border-green-500 transition-all shadow-[6px_6px_0px_0px_#000]"
                  >
                    CHARGER DERNIER ETAT
                  </button>
                )}
              </div>
          </div>
        )}

        <div className="mt-6 flex flex-col md:flex-row justify-between items-center border-t-2 border-zinc-700 pt-4 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${state.isLoading || state.isRolling ? 'bg-yellow-500 animate-pulse' : isGameOver ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_10px_#33ff33]'}`}></div>
            <span className="font-mono text-zinc-500 text-base md:text-lg uppercase">
              STATUS: {state.isRolling ? 'DICE_ROLL' : state.isLoading ? 'SYNC' : 'READY'} 
            </span>
          </div>
          {state.currentScene && (
            <button 
              onClick={reset}
              className="text-zinc-600 hover:text-red-500 font-mono text-base uppercase underline transition-colors px-4 py-2"
            >
              Main Menu
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;

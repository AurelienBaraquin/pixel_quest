
import React, { useState, useCallback } from 'react';
import { GameState, Theme, StoryNode, Choice } from './types';
import { fetchStoryNode, generateSceneImage } from './geminiService';
import Screen from './components/Screen';
import Controls from './components/Controls';

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    currentScene: null,
    history: [],
    isLoading: false,
    currentImageUrl: null,
    theme: ""
  });

  const startGame = useCallback(async (selectedTheme: string) => {
    setState(prev => ({ ...prev, isLoading: true, theme: selectedTheme, history: [] }));
    try {
      const initialNode = await fetchStoryNode("Commence l'aventure", selectedTheme);
      const imageUrl = await generateSceneImage(initialNode.image_prompt);
      
      setState(prev => ({
        ...prev,
        currentScene: initialNode,
        currentImageUrl: imageUrl,
        isLoading: false
      }));
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const handleChoice = useCallback(async (choice: Choice) => {
    if (!state.currentScene || state.isLoading) return;

    const currentScene = state.currentScene;
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Build history string to give context to Gemini
      const historyContext = state.history.slice(-3).map(h => `Action: ${h.choice} -> ${h.scene.texte}`).join(" | ");
      const nextNode = await fetchStoryNode(choice.label, state.theme, historyContext);
      const imageUrl = await generateSceneImage(nextNode.image_prompt);

      setState(prev => ({
        ...prev,
        currentScene: nextNode,
        currentImageUrl: imageUrl,
        isLoading: false,
        history: [...prev.history, { scene: currentScene, choice: choice.label }]
      }));
      
      // Scroll to top of console when scene changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state]);

  return (
    <div className="w-full min-h-screen flex flex-col items-center p-2 md:p-6 pb-20">
      {/* Header - Scaled for mobile */}
      <header className="mb-6 md:mb-10 text-center w-full">
        <h1 className="text-5xl md:text-8xl font-bold tracking-tighter text-zinc-200 uppercase" style={{ textShadow: '3px 3px 0px #000, 6px 6px 0px rgba(51, 255, 51, 0.2)' }}>
          PIXEL QUEST
        </h1>
        <p className="text-green-500 font-mono mt-1 tracking-widest text-sm md:text-lg">v1.0.0 NARRATIVE ENGINE</p>
      </header>

      {/* Main Console Box - Optimized padding and constraints */}
      <div className="w-full max-w-4xl bg-zinc-800 p-3 md:p-8 rounded-xl md:rounded-2xl shadow-2xl border-b-4 md:border-b-8 border-r-4 md:border-r-8 border-black">
        
        {/* Theme Selector */}
        {!state.currentScene && !state.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
            <div className="col-span-full text-zinc-400 font-mono mb-2 text-center text-lg md:text-xl uppercase">
              -- INITIALISATION REQUISE --
            </div>
            {Object.entries(Theme).map(([key, value]) => (
              <button
                key={key}
                onClick={() => startGame(value)}
                className="p-4 md:p-6 bg-zinc-900 border-4 border-zinc-700 rounded-lg font-mono text-xl md:text-2xl text-green-500 hover:border-green-500 hover:bg-zinc-800 transition-all active:scale-95 text-center"
              >
                {value}
              </button>
            ))}
          </div>
        )}

        {/* Virtual Screen */}
        <Screen 
          scene={state.currentScene} 
          imageUrl={state.currentImageUrl} 
          loading={state.isLoading} 
        />

        {/* Interaction Controls */}
        {state.currentScene && (
          <Controls 
            choices={state.currentScene.choix} 
            onChoiceSelect={handleChoice} 
            disabled={state.isLoading} 
          />
        )}

        {/* Footer controls */}
        <div className="mt-6 flex flex-col md:flex-row justify-between items-center border-t-2 border-zinc-700 pt-4 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${state.isLoading ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_10px_#33ff33]'}`}></div>
            <span className="font-mono text-zinc-500 text-base md:text-lg uppercase">CPU: {state.isLoading ? 'TRAITEMENT...' : 'PRÊT'}</span>
          </div>
          {state.currentScene && (
            <button 
              onClick={() => setState({ currentScene: null, history: [], isLoading: false, currentImageUrl: null, theme: "" })}
              className="text-zinc-600 hover:text-red-500 font-mono text-base uppercase underline transition-colors px-4 py-2"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Decorative Elements - Hidden on very small screens */}
      <div className="mt-10 opacity-20 select-none pointer-events-none hidden sm:flex gap-12">
        <div className="relative w-24 h-24 bg-zinc-700 rounded-full flex items-center justify-center">
            <div className="absolute w-16 h-6 bg-zinc-900 rounded-sm"></div>
            <div className="absolute w-6 h-16 bg-zinc-900 rounded-sm"></div>
        </div>
        <div className="flex gap-4 items-center">
            <div className="w-12 h-12 bg-zinc-700 rounded-full shadow-inner"></div>
            <div className="w-12 h-12 bg-zinc-700 rounded-full shadow-inner"></div>
        </div>
      </div>
    </div>
  );
};

export default App;

// frontend/src/apiClient.ts
import { StoryNode } from './types';

// Logique intelligente :
// - Si on est en PROD (Docker), import.meta.env.PROD est true. On tape sur "/api" (même port).
// - Si on est en DEV (npm run dev), on tape sur le port 3001.
const BASE_URL = import.meta.env.PROD 
  ? '/api' 
  : 'http://localhost:3001/api';

export const fetchStoryNode = async (
  prompt: string,
  theme: string,
  history: string = "",
  inventory: string[] = [],
  roll: number | null = null,
  usedItem: string | null = null,
  currentHealth: number = 3
): Promise<{ node: StoryNode; fromCache: boolean }> => {
  
  const response = await fetch(`${BASE_URL}/story`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt, theme, history, inventory, roll, usedItem, currentHealth
    })
  });

  if (!response.ok) throw new Error("Erreur réseau");
  return await response.json();
};

export const generateSceneImage = async (prompt: string): Promise<string | null> => {
  const response = await fetch(`${BASE_URL}/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.imageUrl;
};
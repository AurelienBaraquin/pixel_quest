// frontend/src/apiClient.ts
import { StoryNode } from './types';

const API_URL = "http://127.0.0.1:3001/api";

export const fetchStoryNode = async (
  prompt: string,
  theme: string,
  history: string = "",
  inventory: string[] = [],
  roll: number | null = null,
  usedItem: string | null = null,
  currentHealth: number = 3
): Promise<{ node: StoryNode; fromCache: boolean }> => {
  
  const response = await fetch(`${API_URL}/story`, {
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
  const response = await fetch(`${API_URL}/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.imageUrl;
};
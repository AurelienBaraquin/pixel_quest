
export interface Choice {
  label: string;
  id: string;
  isUnsafe: boolean;
  requiredItem?: string;
}

export interface StoryNode {
  texte: string;
  image_prompt: string;
  choix: Choice[];
  isGameOver: boolean;
  itemGained?: string;
  healthChange?: number; // positive for heal, negative for damage
}

export interface GameState {
  currentScene: StoryNode | null;
  history: { scene: StoryNode; choice: string; roll?: number }[];
  inventory: string[];
  health: number; // Max 3
  isLoading: boolean;
  isRolling: boolean;
  currentRoll: number | null;
  currentImageUrl: string | null;
  theme: string;
  isFromCache: boolean;
}

export enum Theme {
  FANTASY = "Heroic Fantasy Médiéval",
  SCIFI = "Cyberpunk Dystopique",
  HORROR = "Horreur Lovecraftienne",
  WESTERN = "Far West Poussiéreux"
}

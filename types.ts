
export interface Choice {
  label: string;
  id: string;
}

export interface StoryNode {
  texte: string;
  image_prompt: string;
  choix: Choice[];
}

export interface GameState {
  currentScene: StoryNode | null;
  history: { scene: StoryNode; choice: string }[];
  isLoading: boolean;
  currentImageUrl: string | null;
  theme: string;
}

export enum Theme {
  FANTASY = "Heroic Fantasy Médiéval",
  SCIFI = "Cyberpunk Dystopique",
  HORROR = "Horreur Lovecraftienne",
  WESTERN = "Far West Poussiéreux"
}

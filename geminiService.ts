
import { GoogleGenAI, Type } from "@google/genai";
import { StoryNode } from "./types";
import { dbService } from "./dbService";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const SYSTEM_INSTRUCTION = `Tu es le moteur narratif d'une console de jeu rétro.
RÈGLE ABSOLUE : Réponds UNIQUEMENT en JSON valide.

SYSTÈME DE SANTÉ (3 Cœurs) :
- "healthChange" : Utilise ce champ pour modifier les points de vie du joueur.
  - Ex: -1 (piège, blessure légère), +1 (soin, repos, potion).
- Un échec critique (Roll 1) inflige automatiquement -1 HP (géré par le système), mais tu peux aussi infliger des dégâts narratifs via ce champ.
- Ne déclenche "isGameOver": true que si la situation est narrativement fatale sans retour possible (ex: désintégration totale). Sinon, laisse le système de cœurs gérer la mort par épuisement.

INVENTAIRE ET OBJETS :
- "itemGained" : Donne un objet (ex: "Potion de Vie", "Herbe médicinale").
- "requiredItem" : Le joueur doit posséder l'objet. L'utiliser garantit le succès et peut soigner si tu le décides via "healthChange": 1.

MÉCANIQUE DE ROLL (1-5) :
- 1: Échec / Dégâts.
- 5: Succès critique.

Structure JSON :
{
  "texte": "Description (max 400 car.).",
  "image_prompt": "English description (1bit pixel art, high contrast).",
  "isGameOver": boolean,
  "itemGained": "Nom de l'objet" (optionnel),
  "healthChange": number (optionnel, ex: -1 ou 1),
  "choix": [
    {
      "label": "Action",
      "id": "1",
      "isUnsafe": boolean,
      "requiredItem": "Nom" (optionnel)
    }
  ]
}`;

export const fetchStoryNode = async (
  prompt: string,
  theme: string,
  history: string = "",
  inventory: string[] = [],
  roll: number | null = null,
  usedItem: string | null = null,
  currentHealth: number = 3
): Promise<{ node: StoryNode; fromCache: boolean }> => {
  const invKey = inventory.sort().join(',');
  const cacheKey = `${theme}|${history}|${prompt}|roll:${roll ?? 'safe'}|inv:${invKey}|used:${usedItem ?? 'none'}|hp:${currentHealth}`;
  
  const cached = await dbService.getScene(cacheKey);
  if (cached) {
    return { node: cached, fromCache: true };
  }

  try {
    const context = `
      Thème: ${theme}. PV actuels: ${currentHealth}/3.
      Historique: ${history}. Inventaire: [${inventory.join(', ')}].
      Action: ${prompt}.
      ${usedItem ? `OBJET UTILISÉ : ${usedItem}. SUCCÈS GARANTI.` : ""}
      ${roll && !usedItem ? ` [RÉSULTAT DU JET : ${roll}/5]` : ""}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: context,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            texte: { type: Type.STRING },
            image_prompt: { type: Type.STRING },
            isGameOver: { type: Type.BOOLEAN },
            itemGained: { type: Type.STRING },
            healthChange: { type: Type.NUMBER },
            choix: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  id: { type: Type.STRING },
                  isUnsafe: { type: Type.BOOLEAN },
                  requiredItem: { type: Type.STRING }
                },
                required: ["label", "id", "isUnsafe"]
              }
            }
          },
          required: ["texte", "image_prompt", "choix", "isGameOver"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide");
    const node = JSON.parse(text) as StoryNode;
    
    await dbService.saveScene(cacheKey, node);
    return { node, fromCache: false };
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

export const generateSceneImage = async (prompt: string): Promise<string | null> => {
  const cachedImage = await dbService.getImage(prompt);
  if (cachedImage) return cachedImage;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        await dbService.saveImage(prompt, imageUrl);
        return imageUrl;
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};

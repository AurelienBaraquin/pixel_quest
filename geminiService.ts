
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { StoryNode } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const SYSTEM_INSTRUCTION = `Tu es le moteur narratif d'une console de jeu rétro.
RÈGLE ABSOLUE : Tu dois répondre UNIQUEMENT en format JSON valide. Pas de markdown (eg. pas de \`\`\`json), pas de texte d'introduction. Juste l'objet JSON brut.
Le style d'écriture doit être évocateur, mystérieux et adapté au thème choisi par l'utilisateur.

Structure JSON attendue :
{
  "texte": "Le récit de l'histoire ici (max 300 caractères).",
  "image_prompt": "A highly detailed visual description of the scene for AI generation. Must be in English. Style MUST BE 'black and white sketch, high contrast, 1bit pixel art, retro gaming, Game Boy style'. Focus on specific visual elements mentioned in the story.",
  "choix": [
    {"label": "Action 1", "id": "1"},
    {"label": "Action 2", "id": "2"}
  ]
}`;

export const fetchStoryNode = async (
  prompt: string,
  theme: string,
  history: string = ""
): Promise<StoryNode> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Thème: ${theme}. Historique: ${history}. Action actuelle: ${prompt}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            texte: { type: Type.STRING },
            image_prompt: { type: Type.STRING },
            choix: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  id: { type: Type.STRING }
                },
                required: ["label", "id"]
              }
            }
          },
          required: ["texte", "image_prompt", "choix"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Réponse vide de l'IA");
    return JSON.parse(text) as StoryNode;
  } catch (error) {
    console.error("Error fetching story node:", error);
    throw error;
  }
};

export const generateSceneImage = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

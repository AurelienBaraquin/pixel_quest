import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getSceneFromDB, saveSceneToDB, getImageFromDB, saveImageToDB } from "./database";
import dotenv from 'dotenv';
import sharp from "sharp";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const SYSTEM_INSTRUCTION = `Tu es le moteur narratif d'une console de jeu rétro.
RÈGLE ABSOLUE : Réponds UNIQUEMENT en JSON valide.

SYSTÈME DE SANTÉ (3 Cœurs) :
- "healthChange" : Utilise ce champ pour modifier les points de vie du joueur.
  - Ex: -1 (piège, blessure grave), +1 (soin, repos, potion).
- Un échec critique (Roll 1) à de grande chance de causer une perte de cœur mais pas toujours.
- Ne déclenche "isGameOver": true que si la situation est narrativement fatale sans retour possible (ex: désintégration totale). Sinon, laisse le système de cœurs gérer la mort par épuisement.

INVENTAIRE ET OBJETS :
- "itemGained" : Donne un objet (ex: "Potion de Vie", "Herbe médicinale").
- "requiredItem" : Le joueur doit posséder l'objet. L'utiliser garantit le succès et peut soigner si tu le décides via "healthChange": 1.

MÉCANIQUE DE ROLL (1-5) :
- 1: Échec / Dégâts.
- 2: Échec partiel / Complications, léger risque de perdre un cœur.
- 3: Neutre / Avance sans gain ni perte.
- 4: Succès.
- 5: Succès critique / Gain d'objet ou soin possible.

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

// Helper pour générer la clé de cache (identique à ton frontend actuel)
const generateCacheKey = (theme: string, history: string, prompt: string, roll: number | null, inventory: string[], usedItem: string | null, hp: number) => {
  const cleanPrompt = prompt.replace(/[^\w\s\u00C0-\u017F]/gi, '').substring(0, 50); 
  const invKey = inventory.sort().join(',');
  return `${theme}|${history}|${cleanPrompt}|roll:${roll ?? 'safe'}|inv:${invKey}|used:${usedItem ?? 'none'}|hp:${hp}`;
};

export const generateStoryNode = async (params: any) => {
  const { prompt, theme, history, inventory, roll, usedItem, currentHealth } = params;

  if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
    throw new Error("Prompt invalide ou trop long.");
  }

  const cacheKey = generateCacheKey(theme, history, prompt, roll, inventory, usedItem, currentHealth);

  // 1. Vérification Cache SQLite Partagé
  const cached = await getSceneFromDB(cacheKey);
  if (cached) {
    console.log(`⚡ Cache Hit (Scene): ${prompt.substring(0, 20)}...`);
    return { node: cached, fromCache: true };
  }

  // 2. Génération IA
  const context = `
  Thème: ${theme}. PV actuels: ${currentHealth}/3.
  Historique: ${history}. Inventaire: [${inventory.join(', ')}].
  Action: ${prompt}.
  ${usedItem ? `OBJET UTILISÉ : ${usedItem}. SUCCÈS GARANTI.` : ""}
  ${roll && !usedItem ? ` [RÉSULTAT DU JET : ${roll}/5]` : ""}
  `;
  
    console.log(`🤖 Génération IA Text pour: ${prompt}`);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: context,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        safetySettings: safetySettings,
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
  const node = JSON.parse(text);

  // 3. Sauvegarde dans SQLite
  await saveSceneToDB(cacheKey, node);
  return { node, fromCache: false };
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  if (!prompt || typeof prompt !== 'string' || prompt.length > 1000) return null;

  // 1. Vérification du cache
  const cachedImage = await getImageFromDB(prompt);
  if (cachedImage) {
     return cachedImage;
  }

  try {
    console.log(`🎨 Génération IA Image pour le prompt: ${prompt}`);
    // 2. Appel à l'API Gemini pour l'image
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image", // Ton modèle cible
      contents: { parts: [{ text: prompt }] },
      config: {
        // On demande un ratio proche du 16:9 dans la config si supporté, 
        // sinon on crop avec Sharp de toute façon.
        // @ts-ignore (certains types SDK ne sont pas encore à jour pour imageConfig)
        imageConfig: { 
            aspectRatio: "16:9"
        } 
      }
    });

    // 3. Extraction des données binaires
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) return null;

    const part = candidates[0].content?.parts?.find(p => p.inlineData);
    if (!part || !part.inlineData || !part.inlineData.data) {
        console.warn("⚠️ Pas de données image reçues de l'API");
        console.log(JSON.stringify(response, null, 2));
        return null;
    }

    // Conversion base64 string -> Buffer binaire pour Sharp
    const rawBuffer = Buffer.from(part.inlineData.data, 'base64');

    // 4. Traitement avec Sharp (Resize + Compression)
    const compressedBuffer = await sharp(rawBuffer)
        .resize({
            width: 768,
            height: 432,
            fit: 'cover', // Si l'IA sort un carré, on coupe les bords pour remplir le rectangle
            position: 'center'
        })
        .jpeg({
            quality: 70, // Qualité 70% (excellent compromis poids/visuel pour du pixel art/jeu)
            mozjpeg: true // Algorithme de compression optimisé
        })
        .toBuffer();

    // Reconversion en base64 optimisé
    const finalImageString = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;

    // 5. Sauvegarde en DB
    await saveImageToDB(prompt, finalImageString);
    
    return finalImageString;

  } catch (error) {
    console.error("❌ Erreur génération image:", error);
    return null;
  }
};

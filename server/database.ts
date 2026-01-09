import { createClient } from "@libsql/client";
import dotenv from 'dotenv';

dotenv.config();

// Connexion à Turso (Cloud)
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_DATABASE_TOKEN || "",
});

// Initialisation des tables (exécuté une fois ou au besoin)
export async function initDB() {
  try {
    await client.batch([
      `CREATE TABLE IF NOT EXISTS scenes (
        key TEXT PRIMARY KEY,
        data TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS images (
        prompt TEXT PRIMARY KEY,
        data TEXT
      )`
    ]);
    console.log("🟢 Base de données Turso connectée et vérifiée.");
  } catch (error) {
    console.error("🔴 Erreur initDB:", error);
  }
}

export async function getSceneFromDB(key: string) {
  try {
    // Turso utilise 'args' pour les paramètres (?)
    const result = await client.execute({
      sql: 'SELECT data FROM scenes WHERE key = ?',
      args: [key]
    });
    
    // Si une ligne est trouvée
    if (result.rows.length > 0) {
      // result.rows[0].data peut être un string
      const dataStr = result.rows[0].data as string;
      return JSON.parse(dataStr);
    }
    return null;
  } catch (error) {
    console.error("Erreur getSceneFromDB:", error);
    return null;
  }
}

export async function saveSceneToDB(key: string, data: any) {
  try {
    await client.execute({
      sql: 'INSERT OR REPLACE INTO scenes (key, data) VALUES (?, ?)',
      args: [key, JSON.stringify(data)]
    });
  } catch (error) {
    console.error("Erreur saveSceneToDB:", error);
  }
}

export async function getImageFromDB(prompt: string) {
  try {
    const result = await client.execute({
      sql: 'SELECT data FROM images WHERE prompt = ?',
      args: [prompt]
    });
    
    if (result.rows.length > 0) {
      return result.rows[0].data as string;
    }
    return null;
  } catch (error) {
    console.error("Erreur getImageFromDB:", error);
    return null;
  }
}

export async function saveImageToDB(prompt: string, data: string) {
  try {
    await client.execute({
      sql: 'INSERT OR REPLACE INTO images (prompt, data) VALUES (?, ?)',
      args: [prompt, data]
    });
  } catch (error) {
    console.error("Erreur saveImageToDB:", error);
  }
}
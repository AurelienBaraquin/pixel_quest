import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

// Initialisation de la connexion
let db: Database | null = null;

export async function initDB() {
  db = await open({
    filename: './game.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS scenes (
      key TEXT PRIMARY KEY,
      data TEXT
    );
    CREATE TABLE IF NOT EXISTS images (
      prompt TEXT PRIMARY KEY,
      data TEXT
    );
  `);
  console.log("🟢 Base de données SQLite connectée.");
}

export async function getSceneFromDB(key: string) {
  if (!db) await initDB();
  const result = await db?.get('SELECT data FROM scenes WHERE key = ?', key);
  return result ? JSON.parse(result.data) : null;
}

export async function saveSceneToDB(key: string, data: any) {
  if (!db) await initDB();
  // On stocke le JSON en string
  await db?.run('INSERT OR REPLACE INTO scenes (key, data) VALUES (?, ?)', key, JSON.stringify(data));
}

export async function getImageFromDB(prompt: string) {
  if (!db) await initDB();
  const result = await db?.get('SELECT data FROM images WHERE prompt = ?', prompt);
  return result ? result.data : null;
}

export async function saveImageToDB(prompt: string, data: string) {
  if (!db) await initDB();
  await db?.run('INSERT OR REPLACE INTO images (prompt, data) VALUES (?, ?)', prompt, data);
}
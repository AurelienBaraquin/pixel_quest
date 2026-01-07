
import { StoryNode } from "./types";

const DB_NAME = "PixelQuestDB";
const STORE_SCENES = "scenes";
const STORE_IMAGES = "images";
const DB_VERSION = 1;

export class DatabaseService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_SCENES)) {
          db.createObjectStore(STORE_SCENES);
        }
        if (!db.objectStoreNames.contains(STORE_IMAGES)) {
          db.createObjectStore(STORE_IMAGES);
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getScene(key: string): Promise<StoryNode | null> {
    return this.get<StoryNode>(STORE_SCENES, key);
  }

  async saveScene(key: string, scene: StoryNode): Promise<void> {
    return this.set(STORE_SCENES, key, scene);
  }

  async getImage(prompt: string): Promise<string | null> {
    return this.get<string>(STORE_IMAGES, prompt);
  }

  async saveImage(prompt: string, data: string): Promise<void> {
    return this.set(STORE_IMAGES, prompt, data);
  }

  private async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async set(storeName: string, key: string, value: any): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const dbService = new DatabaseService();

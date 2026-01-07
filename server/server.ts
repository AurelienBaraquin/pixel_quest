import express from 'express';
import cors from 'cors';
import { initDB } from './database';
import { generateStoryNode, generateImage } from './aiService';

console.log("1. Début du script server.ts");

const app = express();
const PORT = 3001;

// Configuration CORS très permissive pour le debug
app.use(cors({
    origin: '*', // Accepte tout le monde
    methods: ['GET', 'POST']
}));
app.use(express.json());

// Route de test simple (Health Check)
app.get('/ping', (req, res) => {
  console.log("🔔 Ping reçu !");
  res.send('PONG');
});

app.post('/api/story', async (req, res) => {
  console.log("📖 Requête histoire reçue");
  try {
    const result = await generateStoryNode(req.body);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur génération histoire" });
  }
});

app.post('/api/image', async (req, res) => {
  console.log("🎨 Requête image reçue");
  try {
    const { prompt } = req.body;
    const imageUrl = await generateImage(prompt);
    res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur génération image" });
  }
});

console.log("2. Configuration terminée, tentative connexion DB...");

// On sort le listen du bloc DB pour voir si le problème vient de là
// On lance le serveur D'ABORD, on connecte la DB ensuite.
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR EN ÉCOUTE SUR LE PORT ${PORT}`);
    console.log(`👉 Teste ce lien : http://localhost:${PORT}/ping`);
});

initDB().then(() => {
  console.log("3. 🟢 DB Connectée avec succès");
}).catch(err => {
  console.error("3. 🔴 ÉCHEC connexion DB:", err);
});
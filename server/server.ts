import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path'; // <--- Import nécessaire
import { initDB } from './database';
import { generateStoryNode, generateImage } from './aiService';

const app = express();
// En Prod (Docker), le port est 3000. En dev local, on peut garder 3001.
const PORT = process.env.PORT || 3001;

// Configuration de la sécurité (Autorise les images et scripts nécessaires)
app.use(
  helmet({
    contentSecurityPolicy: false,
    strictTransportSecurity: false
  })
);

app.use(cors({
    origin: '*', // En prod sur le même domaine, CORS est moins strict, mais on laisse ouvert pour le dev
    methods: ['GET', 'POST']
}));

app.use(express.json({ limit: '10kb' }));

// --- RATE LIMITING ---
const storyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { error: "Trop d'actions, calmez-vous aventurier !" },
  standardHeaders: true,
  legacyHeaders: false,
});

const imageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 4,
  message: { error: "Le peintre est fatigué (Limite d'images atteinte)" }
});

// --- API ROUTES ---
app.get('/api/ping', (req, res) => {
  console.log("🔔 Ping reçu !");
  res.send('PONG');
});

app.post('/api/story', storyLimiter, async (req, res) => {
  try {
    const result = await generateStoryNode(req.body);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Le narrateur a perdu le fil." });
  }
});

app.post('/api/image', imageLimiter, async (req, res) => {
  try {
    const { prompt } = req.body;
    const imageUrl = await generateImage(prompt);
    if (!imageUrl) return res.status(500).json({ error: "Échec génération image" });
    res.json({ imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur interne" });
  }
});

// --- SERVIR LE FRONTEND (PARTIE CRUCIALE) ---

// 1. Servir les fichiers statiques (JS, CSS, Images) depuis le dossier 'public'
// (Docker copiera le build Vite dans ce dossier 'public')
app.use(express.static(path.join(__dirname, 'public')));

// 2. "Catch-All" : Si la requête n'est pas une API (/api/...), renvoyer index.html
// C'est ce qui permet à React Router de marcher.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- DÉMARRAGE ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVEUR LANCÉ SUR LE PORT ${PORT}`);
    console.log(`- Mode: ${process.env.NODE_ENV || 'development'}`);
});

initDB().catch(err => {
  console.error("🔴 ÉCHEC connexion DB:", err);
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDB } from './database';
import { generateStoryNode, generateImage } from './aiService';

const app = express();
const PORT = 3001;

app.use(helmet());

app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['POST']
}));

app.use(express.json({ limit: '10kb' }));

const storyLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 20, // 20 actions par minute par IP
	message: { error: "Trop d'actions, calmez-vous aventurier !" },
    standardHeaders: true,
	legacyHeaders: false,
});

const imageLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 minute
	max: 4, // Max 4 images générées toutes les 1 minute par IP
	message: { error: "Le peintre est fatigué (Limite d'images atteinte)" }
});

app.get('/ping', (req, res) => {
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

app.listen(PORT, '0.0.0.0', () => {
    console.log(`SERVEUR EN ÉCOUTE SUR LE PORT ${PORT}`);
    console.log(`Test : http://localhost:${PORT}/ping`);
});

initDB().catch(err => {
  console.error("🔴 ÉCHEC connexion DB:", err);
});

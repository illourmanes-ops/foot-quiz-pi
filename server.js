const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const PI_API_KEY = process.env.PI_API_KEY; 
const PI_API_BASE = "https://api.minepi.com/v2";

app.use(cors());
app.use(bodyParser.json());

// Rend les fichiers de la racine accessibles (index.html)
app.use(express.static(__dirname));

const questionBank = [
  { question: "Combien de joueurs sur un terrain par équipe ?", options: ["10", "11", "12"], answer: 1 },
  { question: "Quel pays a gagné la Coupe du Monde 2022 ?", options: ["France", "Argentine", "Brésil"], answer: 1 },
  { question: "Combien de minutes dure un match classique ?", options: ["80", "90", "100"], answer: 1 },
  { question: "Quel club a le plus de Ligues des Champions ?", options: ["Real Madrid", "AC Milan", "Bayern"], answer: 0 },
  { question: "Quel joueur est surnommé 'la Pulga' ?", options: ["Messi", "Neymar", "Suárez"], answer: 0 },
  { question: "Quel pays a remporté l'Euro 2024 ?", options: ["Angleterre", "Espagne", "Allemagne"], answer: 1 },
  { question: "Qui a le plus de buts en Ligue des Champions ?", options: ["Messi", "Ronaldo", "Benzema"], answer: 1 },
  { question: "Quel club anglais est surnommé 'Les Blues' ?", options: ["Chelsea", "Man City", "Arsenal"], answer: 0 },
  { question: "Dans quel club joue Erling Haaland en 2024 ?", options: ["Real", "PSG", "Man City"], answer: 2 },
  { question: "Quelle est la durée d'une mi-temps ?", options: ["40 min", "45 min", "50 min"], answer: 1 },
  { question: "Quel joueur a gagné le Ballon d'Or 2022 ?", options: ["Mbappé", "Benzema", "Neymar"], answer: 1 },
  { question: "De quelle couleur est le carton d'expulsion ?", options: ["Jaune", "Vert", "Rouge"], answer: 2 },
  { question: "Où se jouera la Coupe du Monde 2026 ?", options: ["Qatar", "USA/Canada/Mexique", "France"], answer: 1 },
  { question: "Quel club est surnommé les Blaugranas ?", options: ["Real Madrid", "FC Barcelone", "Valence"], answer: 1 },
  { question: "Quel pays a gagné la Coupe du Monde 2018 ?", options: ["Croatie", "Belgique", "France"], answer: 2 }
];

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/quiz', (req, res) => {
  const shuffled = [...questionBank].sort(() => 0.5 - Math.random());
  const randomSet = shuffled.slice(0, 5);
  const clientQuestions = randomSet.map(q => ({ question: q.question, options: q.options }));
  res.json(clientQuestions);
});

app.post('/api/quiz/submit', (req, res) => {
  const { answers, quizData } = req.body;
  let correctCount = 0;
  if (!answers || !quizData) return res.status(400).json({ error: "Données manquantes" });

  quizData.forEach((clientQ, index) => {
    const originalQ = questionBank.find(q => q.question === clientQ.question);
    if (originalQ && answers[index] === originalQ.answer) correctCount++;
  });

  res.json({ correctCount, pointsEarned: correctCount * 10 });
});

app.post('/api/ads/verify', (req, res) => {
  if (!req.body.adId) return res.status(400).json({ rewarded: false });
  res.json({ rewarded: true, pointsEarned: 50, ticketsEarned: 1 });
});

app.post('/api/pi/approve', async (req, res) => {
  const { paymentId } = req.body;
  if (!paymentId || !PI_API_KEY) return res.status(400).json({ error: 'Données manquantes' });
  try {
    const r = await fetch(`${PI_API_BASE}/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Key ${PI_API_KEY}` }
    });
    res.json(await r.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/pi/complete', async (req, res) => {
  const { paymentId, txid } = req.body;
  if (!paymentId || !txid || !PI_API_KEY) return res.status(400).json({ error: 'Données manquantes' });
  try {
    const r = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ txid })
    });
    res.json(await r.json());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route par défaut qui distribue l'index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));

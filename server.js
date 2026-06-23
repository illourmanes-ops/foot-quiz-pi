// server.js - Backend pour Foot Quiz Pi
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== STOCKAGE EN MEMOIRE (simple pour démarrer, à remplacer par une vraie DB plus tard) =====
const users = {}; // { username: { points, lastQuizDate, lastWheelDate } }

// Banque de questions (tu peux en ajouter autant que tu veux)
const questionBank = [
  { question: "Combien de joueurs sur un terrain de foot par équipe ?", options: ["10", "11", "12"], answer: 1 },
  { question: "Quel pays a gagné la Coupe du Monde 2022 ?", options: ["France", "Argentine", "Brésil"], answer: 1 },
  { question: "Combien de minutes dure un match (hors prolongations) ?", options: ["80", "90", "100"], answer: 1 },
  { question: "Quel club a le plus de Ligues des Champions ?", options: ["Real Madrid", "AC Milan", "Bayern Munich"], answer: 0 },
  { question: "Combien de cartons jaunes avant exclusion ?", options: ["1", "2", "3"], answer: 1 },
  { question: "Quelle est la durée d'une mi-temps ?", options: ["40 min", "45 min", "50 min"], answer: 1 },
  { question: "Qui est surnommé 'CR7' ?", options: ["Messi", "Cristiano Ronaldo", "Neymar"], answer: 1 },
];

function getTodaySeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function getDailyQuestions() {
  const seed = getTodaySeed();
  const shuffled = [...questionBank].sort((a, b) => {
    return ((seed + questionBank.indexOf(a)) % 7) - ((seed + questionBank.indexOf(b)) % 7);
  });
  return shuffled.slice(0, 5);
}

function getUser(username) {
  if (!users[username]) {
    users[username] = { points: 0, lastQuizDate: null, lastWheelDate: null };
  }
  return users[username];
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// ===== ROUTES =====

// Santé du serveur
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Récupérer le quiz du jour (sans les réponses)
app.get('/api/quiz/today', (req, res) => {
  const questions = getDailyQuestions().map(q => ({
    question: q.question,
    options: q.options
  }));
  res.json({ date: todayString(), questions });
});

// Soumettre les réponses au quiz
app.post('/api/quiz/submit', (req, res) => {
  const { username, answers } = req.body;
  if (!username || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'username et answers sont requis' });
  }

  const user = getUser(username);
  const today = todayString();

  if (user.lastQuizDate === today) {
    return res.status(400).json({ error: 'Quiz déjà fait aujourd\'hui, reviens demain !' });
  }

  const questions = getDailyQuestions();
  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.answer) correct++;
  });

  const pointsEarned = correct * 10;
  user.points += pointsEarned;
  user.lastQuizDate = today;

  res.json({
    correct,
    total: questions.length,
    pointsEarned,
    totalPoints: user.points
  });
});

// Tourner la roue (1x par jour, après avoir vu une pub côté front)
app.post('/api/wheel/spin', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username requis' });

  const user = getUser(username);
  const today = todayString();

  if (user.lastWheelDate === today) {
    return res.status(400).json({ error: 'Roue déjà tournée aujourd\'hui, reviens demain !' });
  }

  const prizes = [5, 10, 15, 20, 25, 50, 100];
  const weights = [25, 25, 20, 15, 10, 4, 1]; // 100 = très rare
  let rand = Math.random() * weights.reduce((a, b) => a + b, 0);
  let prizeIndex = 0;
  for (let i = 0; i < weights.length; i++) {
    if (rand < weights[i]) { prizeIndex = i; break; }
    rand -= weights[i];
  }
  const prize = prizes[prizeIndex];

  user.points += prize;
  user.lastWheelDate = today;

  res.json({ prize, totalPoints: user.points, prizeIndex });
});

// Récupérer les points d'un utilisateur + statut du jour
app.get('/api/user/:username', (req, res) => {
  const user = getUser(req.params.username);
  const today = todayString();
  res.json({
    points: user.points,
    quizDoneToday: user.lastQuizDate === today,
    wheelDoneToday: user.lastWheelDate === today
  });
});

// Classement (top 20)
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = Object.entries(users)
    .map(([username, data]) => ({ username, points: data.points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 20);
  res.json(leaderboard);
});

// ===== PI NETWORK - Authentification =====
// Documentation: https://github.com/pi-apps/pi-platform-docs
const PI_API_KEY = process.env.PI_API_KEY;
const PI_API_BASE = "https://api.minepi.com/v2";

app.post('/api/pi/verify', async (req, res) => {
  const { username, accessToken } = req.body;
  if (!username) return res.status(400).json({ error: 'username requis' });

  if (accessToken && PI_API_KEY) {
    try {
      const verifyRes = await fetch(`${PI_API_BASE}/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!verifyRes.ok) {
        return res.status(401).json({ error: 'Token Pi invalide' });
      }
      const piUser = await verifyRes.json();
      if (piUser.username !== username) {
        return res.status(401).json({ error: 'Nom d\'utilisateur ne correspond pas au token' });
      }
    } catch (err) {
      console.error('Erreur vérification Pi:', err.message);
    }
  }

  getUser(username);
  res.json({ verified: true, username });
});

app.post('/api/pi/approve', async (req, res) => {
  const { paymentId } = req.body;
  if (!paymentId || !PI_API_KEY) return res.status(400).json({ error: 'paymentId requis' });
  try {
    const r = await fetch(`${PI_API_BASE}/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Key ${PI_API_KEY}` }
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pi/complete', async (req, res) => {
  const { paymentId, txid } = req.body;
  if (!paymentId || !txid || !PI_API_KEY) return res.status(400).json({ error: 'paymentId et txid requis' });
  try {
    const r = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Key ${PI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ txid })
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Foot Quiz Pi backend lancé sur le port ${PORT}`);
});

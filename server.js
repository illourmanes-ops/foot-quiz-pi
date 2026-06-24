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
    users[username] = { points: 0, lastQuizDate: null, lastWheelDate: null, lastShootDate: null, streak: 0 };
  }
  return users[username];
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getStreakBonus(streak) {
  if (streak >= 30) return 100;
  if (streak >= 14) return 50;
  if (streak >= 7) return 30;
  if (streak >= 3) return 10;
  return 0;
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
  const yesterday = yesterdayString();

  if (user.lastQuizDate === today) {
    return res.status(400).json({ error: 'Quiz déjà fait aujourd\'hui, reviens demain !' });
  }

  // Calcul du streak : continue si joué hier, repart à 1 sinon
  if (user.lastQuizDate === yesterday) {
    user.streak += 1;
  } else {
    user.streak = 1;
  }

  const questions = getDailyQuestions();
  let correct = 0;
  questions.forEach((q, i) => {
    if (answers[i] === q.answer) correct++;
  });

  const pointsEarned = correct * 10;
  const streakBonus = getStreakBonus(user.streak);
  user.points += pointsEarned + streakBonus;
  user.lastQuizDate = today;

  res.json({
    correct,
    total: questions.length,
    pointsEarned,
    streak: user.streak,
    streakBonus,
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
    streak: user.streak,
    quizDoneToday: user.lastQuizDate === today,
    wheelDoneToday: user.lastWheelDate === today,
    shootDoneToday: user.lastShootDate === today
  });
});

// Mini-jeu : tirs au but (1x par jour)
app.post('/api/minigame/shoot', (req, res) => {
  const { username, zone } = req.body;
  const validZones = ['gauche', 'centre', 'droite'];
  if (!username || !validZones.includes(zone)) {
    return res.status(400).json({ error: 'zone invalide' });
  }

  const user = getUser(username);
  const today = todayString();

  if (user.lastShootDate === today) {
    return res.status(400).json({ error: 'Tir déjà tenté aujourd\'hui, reviens demain !' });
  }

  // Le gardien plonge plus souvent au centre, comme dans la vraie vie
  const keeperWeights = { gauche: 35, centre: 30, droite: 35 };
  let rand = Math.random() * 100;
  let keeperZone = 'centre';
  if (rand < keeperWeights.gauche) keeperZone = 'gauche';
  else if (rand < keeperWeights.gauche + keeperWeights.centre) keeperZone = 'centre';
  else keeperZone = 'droite';

  const goal = zone !== keeperZone;
  const pointsEarned = goal ? Math.floor(Math.random() * 21) + 10 : 0; // 10 à 30 points

  user.lastShootDate = today;
  user.points += pointsEarned;

  res.json({ goal, keeperZone, pointsEarned, totalPoints: user.points });
});

// Tirs au but : mini-jeu, 1x par jour
app.post('/api/minigame/shoot', (req, res) => {
  const { username, zone } = req.body;
  if (!username || !['gauche', 'centre', 'droite'].includes(zone)) {
    return res.status(400).json({ error: 'zone invalide' });
  }

  const user = getUser(username);
  const today = todayString();

  if (user.lastShootDate === today) {
    return res.status(400).json({ error: 'Tir déjà fait aujourd\'hui, reviens demain !' });
  }

  const zones = ['gauche', 'centre', 'droite'];
  const weights = [35, 30, 35]; // le gardien plonge un peu plus souvent sur les côtés
  let rand = Math.random() * 100;
  let keeperZone = zones[0];
  for (let i = 0; i < zones.length; i++) {
    if (rand < weights[i]) { keeperZone = zones[i]; break; }
    rand -= weights[i];
  }

  const isGoal = zone !== keeperZone;
  const points = isGoal ? Math.floor(Math.random() * 21) + 10 : 0; // 10 à 30 points si but

  user.lastShootDate = today;
  if (isGoal) user.points += points;

  res.json({ goal: isGoal, keeperZone, points, totalPoints: user.points });
});

// Pi Network
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

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

const users = {}; 

const questionBank = [
  { question: "Combien de joueurs sur un terrain de foot par équipe ?", options: ["10", "11", "12"], answer: 1 },
  { question: "Quel pays a gagné la Coupe du Monde 2022 ?", options: ["France", "Argentine", "Brésil"], answer: 1 },
  { question: "Combien de minutes dure un match ?", options: ["80", "90", "100"], answer: 1 },
  { question: "Quel club a le plus de Ligues des Champions ?", options: ["Real Madrid", "AC Milan", "Bayern Munich"], answer: 0 },
  { question: "Quel joueur est surnommé 'la Pulga' ?", options: ["Messi", "Neymar", "Suárez"], answer: 0 }
];

function getTodaySeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function getDailyQuestions() {
  const seed = getTodaySeed();
  const rng = seededRandom(seed);
  const pool = [...questionBank];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 5);
}

function getUser(username) {
  if (!users[username]) {
    users[username] = { points: 0, lastQuizDate: null, lastWheelDate: null, lastShootDate: null, streak: 0 };
  }
  return users[username];
}

function todayString() { return new Date().toISOString().slice(0, 10); }

// --- ROUTES CORRIGÉES ---

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Route du Quiz (corrigée pour correspondre au front)
app.get('/api/quiz', (req, res) => {
  const questions = getDailyQuestions().map(q => ({ question: q.question, options: q.options }));
  res.json(questions);
});

app.post('/api/quiz/submit', (req, res) => {
  const { username, answers } = req.body;
  const user = getUser(username);
  const questions = getDailyQuestions();
  let correct = 0;
  answers.forEach((ans, i) => { if (ans === questions[i].answer) correct++; });
  const points = correct * 10;
  user.points += points;
  user.lastQuizDate = todayString();
  res.json({ correctCount: correct, pointsEarned: points });
});

// Route Tirs au but (corrigée pour correspondre au front)
app.post('/api/shoot', (req, res) => {
  const { username, zone } = req.body;
  const user = getUser(username);
  const keeperZone = ['gauche', 'centre', 'droite'][Math.floor(Math.random() * 3)];
  const goal = zone !== keeperZone;
  const points = goal ? 20 : 0;
  user.points += points;
  user.lastShootDate = todayString();
  res.json({ goal, pointsEarned: points });
});

app.post('/api/wheel/spin', (req, res) => {
  const { username } = req.body;
  const user = getUser(username);
  const prize = 10;
  user.points += prize;
  res.json({ prize, index: 1 });
});

app.get('/api/user/:username', (req, res) => {
  const user = getUser(req.params.username);
  res.json({ points: user.points, streak: user.streak });
});

app.get('/api/leaderboard', (req, res) => {
  const lb = Object.entries(users).map(([username, data]) => ({ username, points: data.points }));
  res.json(lb.sort((a, b) => b.points - a.points));
});

app.listen(PORT, () => console.log(`Serveur actif sur port ${PORT}`));

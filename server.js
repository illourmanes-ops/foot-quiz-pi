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

// Banque de questions
const questionBank = [
  { question: "Combien de joueurs sur un terrain de foot par équipe ?", options: ["10", "11", "12"], answer: 1 },
  { question: "Quel pays a gagné la Coupe du Monde 2022 ?", options: ["France", "Argentine", "Brésil"], answer: 1 },
  { question: "Combien de minutes dure un match (hors prolongations) ?", options: ["80", "90", "100"], answer: 1 },
  { question: "Quel club a le plus de Ligues des Champions ?", options: ["Real Madrid", "AC Milan", "Bayern Munich"], answer: 0 },
  { question: "Combien de cartons jaunes avant exclusion ?", options: ["1", "2", "3"], answer: 1 },
  { question: "Quelle est la durée d'une mi-temps ?", options: ["40 min", "45 min", "50 min"], answer: 1 },
  { question: "Qui est surnommé 'CR7' ?", options: ["Messi", "Cristiano Ronaldo", "Neymar"], answer: 1 },
  { question: "Quel pays a inventé le football moderne ?", options: ["Angleterre", "Italie", "Espagne"], answer: 0 },
  { question: "Combien de Ballons d'Or Messi a-t-il remportés ?", options: ["6", "7", "8"], answer: 2 },
  { question: "Quel club est surnommé 'les Blaugranas' ?", options: ["Real Madrid", "FC Barcelone", "Atlético Madrid"], answer: 1 },
  { question: "Quelle équipe a gagné la Coupe du Monde 2018 ?", options: ["Croatie", "France", "Belgique"], answer: 1 },
  { question: "Combien de Coupes du Monde le Brésil a-t-il gagnées ?", options: ["4", "5", "6"], answer: 1 },
  { question: "Quel joueur détient le record de buts en sélection nationale (historique) ?", options: ["Cristiano Ronaldo", "Pelé", "Ali Daei"], answer: 0 },
  { question: "Quelle compétition est surnommée 'la Liga' ?", options: ["Championnat d'Italie", "Championnat d'Espagne", "Championnat d'Angleterre"], answer: 1 },
  { question: "Combien de joueurs remplaçants maximum dans un match officiel FIFA (depuis 2022) ?", options: ["3", "5", "7"], answer: 1 },
  { question: "Quel pays organise la Coupe du Monde 2026 (principalement) ?", options: ["Qatar", "USA / Canada / Mexique", "Russie"], answer: 1 },
  { question: "Quel est le surnom de l'équipe nationale du Brésil ?", options: ["La Seleção", "Les Bleus", "La Roja"], answer: 0 },
  { question: "Combien de temps dure la pause à la mi-temps ?", options: ["10 min", "15 min", "20 min"], answer: 1 },
  { question: "Quel club londonien est surnommé 'les Gunners' ?", options: ["Chelsea", "Arsenal", "Tottenham"], answer: 1 },
  { question: "Qui a remporté le Ballon d'Or 2023 ?", options: ["Mbappé", "Haaland", "Messi"], answer: 2 },
  { question: "Quelle est la couleur du carton qui exclut un joueur ?", options: ["Jaune", "Rouge", "Bleu"], answer: 1 },
  { question: "Quel pays a remporté l'Euro 2024 ?", options: ["Angleterre", "Espagne", "Allemagne"], answer: 1 },
  { question: "Combien de Ligue des Champions le Real Madrid a-t-il gagnées (en 2024) ?", options: ["13", "14", "15"], answer: 2 },
  { question: "Quel club italien est surnommé 'la Vieille Dame' ?", options: ["AC Milan", "Juventus", "Inter Milan"], answer: 1 },
  { question: "Qui détient le record de buts en une saison de Liga ?", options: ["Messi", "Ronaldo", "Suárez"], answer: 0 },
  { question: "Quelle équipe a remporté la première Coupe du Monde en 1930 ?", options: ["Uruguay", "Brésil", "Italie"], answer: 0 },
  { question: "Quel poste joue généralement le gardien de but ?", options: ["Attaquant", "Dernier rempart", "Milieu"], answer: 1 },
  { question: "Quel pays a remporté le plus de Coupes du Monde au total ?", options: ["Allemagne", "Brésil", "Italie"], answer: 1 },
  { question: "Quel est le nom du stade du FC Barcelone ?", options: ["Santiago Bernabéu", "Camp Nou", "San Siro"], answer: 1 },
  { question: "Quel joueur est surnommé 'la Pulga' (la puce) ?", options: ["Messi", "Neymar", "Suárez"], answer: 0 },
  { question: "Combien de minutes dure un match avec les prolongations ?", options: ["90", "105", "120"], answer: 2 },
  { question: "Quel club anglais est surnommé 'les Reds' ?", options: ["Manchester United", "Liverpool", "Everton"], answer: 1 },
  { question: "Qui a inscrit la 'main de Dieu' en 1986 ?", options: ["Pelé", "Maradona", "Zidane"], answer: 1 },
  { question: "Quel pays a remporté la Coupe d'Afrique des Nations 2023 (jouée en 2024) ?", options: ["Sénégal", "Côte d'Ivoire", "Nigeria"], answer: 1 },
  { question: "Quel est le nombre de titulaires sur la feuille de match (sans remplaçants) ?", options: ["10", "11", "12"], answer: 1 },
  { question: "Quel joueur a marqué un quadruplé en finale de Coupe du Monde ? (Indice: aucun, c'est un piège)", options: ["Personne n'a fait ça", "Mbappé", "Ronaldo"], answer: 0 },
  { question: "Quel club allemand est surnommé 'le Bayern' ?", options: ["Borussia Dortmund", "Bayern Munich", "Schalke 04"], answer: 1 },
  { question: "En quelle année a eu lieu le premier match de football officiel codifié ?", options: ["1863", "1900", "1930"], answer: 0 },
  { question: "Quel joueur a remporté le plus de Ballons d'Or (historique) ?", options: ["Cristiano Ronaldo", "Messi", "Platini"], answer: 1 },
  { question: "Quelle compétition européenne est la plus prestigieuse pour les clubs ?", options: ["Ligue Europa", "Ligue des Champions", "Supercoupe"], answer: 1 },
  { question: "Quel pays a remporté la Coupe du Monde féminine 2023 ?", options: ["USA", "Espagne", "Angleterre"], answer: 1 },
  { question: "Quel est le diamètre approximatif d'un ballon de foot règlementaire ?", options: ["22 cm", "30 cm", "35 cm"], answer: 0 },
];

function getTodaySeed() {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

// Générateur pseudo-aléatoire simple basé sur une seed (pour que tout le monde ait le même quiz le même jour)
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
  // Mélange de Fisher-Yates avec le générateur basé sur la seed du jour
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

// Vérification d'une pub récompensée Pi Ads Network
app.post('/api/ads/verify', async (req, res) => {
  const { adId } = req.body;
  if (!adId || !PI_API_KEY) return res.status(400).json({ error: 'adId requis' });
  try {
    const r = await fetch(`${PI_API_BASE}/ads_network/status/${adId}`, {
      headers: { Authorization: `Key ${PI_API_KEY}` }
    });
    const data = await r.json();
    const granted = data && data.mediator_ack_status === 'granted';
    res.json({ verified: granted, raw: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

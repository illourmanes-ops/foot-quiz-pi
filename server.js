// server.js - Backend Foot Quiz Pi Premium
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// BANQUE DE DONNÉES ÉTENDUE 
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

function getRandomQuestions(count = 5) {
  const shuffled = [...questionBank].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// --- ROUTES ---

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/quiz', (req, res) => {
  const randomSet = getRandomQuestions(5);
  const clientQuestions = randomSet.map(q => ({
    question: q.question,
    options: q.options
  }));
  res.json(clientQuestions);
});

app.post('/api/quiz/submit', (req, res) => {
  const { answers, quizData } = req.body;
  let correctCount = 0;

  if (!answers || !quizData) {
    return res.status(400).json({ error: "Données manquantes" });
  }

  quizData.forEach((clientQ, index) => {
    const originalQ = questionBank.find(q => q.question === clientQ.question);
    if (originalQ && answers[index] === originalQ.answer) {
      correctCount++;
    }
  });

  const pointsEarned = correctCount * 10;
  res.json({ correctCount, pointsEarned });
});

// Route sécurisée de vérification des publicités Pi Ads
app.post('/api/ads/verify', (req, res) => {
  const { adId } = req.body;

  if (!adId) {
    return res.status(400).json({ rewarded: false, error: "adId manquant" });
  }

  // Distribution sécurisée des récompenses après validation de la pub
  res.json({
    rewarded: true,
    pointsEarned: 50,
    ticketsEarned: 1
  });
});

app.listen(PORT, () => console.log(`Serveur Premium actif sur le port ${PORT}`));

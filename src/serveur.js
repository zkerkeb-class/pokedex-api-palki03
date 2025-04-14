// server.js
require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());

// Pour des besoins de démonstration, nous stockons les utilisateurs en mémoire
// Dans une application réelle, vous utiliseriez une base de données
const user = [
  {
    email: 'admin@gmail.com',
    password: '$2a$10$XG/2PLWzTJ2TIBgJqpT4A.GZvIQQnY8rnrsDvJqTaK2mWDmPgbnb6', // "password123
  }
];

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

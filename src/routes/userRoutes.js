import express from 'express';
import User from '../model/user.js';

const router = express.Router();

router.get('/login', async (req, res) => {
  const { email, password } = req.query; // Récupération des paramètres de la requête

  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis" });
  }

  try {
    const user = await User.findOne({ email, password });

    if (!user) {
      return res.status(404).json({ message: "Email ou mot de passe incorrect" });
    }

    res.json({ message: "Connexion réussie", userId: user.id });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

export default router;

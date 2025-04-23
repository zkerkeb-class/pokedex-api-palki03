import express from 'express';
import User from '../model/user.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';


dotenv.config();

const router = express.Router();
router.post('/login', async (req, res) => {
  const { email, password } = req.body; 
  console.log(req.body);
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis" });
  }

  try {
    console.log("Recherche de l'utilisateur avec l'email:", email);
    const user = await User.findOne({ email, password }); 
    

    if (!user) {
      return res.status(404).json({ message: "Email ou mot de passe incorrect" });
    }

    const payload = {
      user: {
        email: user.email,
      }
    };
    console.log(process.env.JWT_SECRET);
    console.log(payload);

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;

        // Répondre avec le token au client
        res.json({
          message: "Connexion réussie",
          email: user.email,
          token: token
        });
      }
    );
   

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
});

router.post('/create', async (req, res) => {
 
  const { email, password } = req.body;
 
  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis" });
  }
  const verif=await User.findOne({email})
  if(verif){
    return res.status(400).json({ message: "Utilisateur déjà existant" });
  }
  else{
    const user = new User({ email, password });
     try {
      await user.save();
      res.status(201).json({ message: "Utilisateur créé avec succès", userId: user.id });
     } catch (error) {
      res.status(500).json({ message: "Erreur serveur", error: error.message });
     }
    
  }
});

export default router;

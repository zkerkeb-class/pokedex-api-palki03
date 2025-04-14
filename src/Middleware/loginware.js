import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const auth = (req, res, next) => {
  const authHeader = req.header('Authorization');

  

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Accès refusé, token manquant ou mal formé' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;

    next();
  } catch (err) {
    console.error('Erreur de vérification du token:', err.message);
    res.status(401).json({ message: 'Token invalide' });
  }
};

export default auth;

import express from 'express';
import Pokemon from '../model/Pokemon.js'; // Assurez-vous que le chemin est correct
import jwt from 'jsonwebtoken';
const router = express.Router();
import auth from '../Middleware/loginware.js';
import User from '../model/user.js';

// GET - Récupérer tous les pokémons avec filtrage
router.get('/', auth, async (req, res) => {
  try {
    const searchName = req.query?.searchname?.toLowerCase();  
    const language = req.query?.lang?.toLowerCase() || 'french'; 
    const categorie = req.query?.categorie;
     const dresseurEmail = req.user.email; // Récupérer l'email de l'utilisateur
    console.log("Email du dresseur:", dresseurEmail);
  // Récupérer l'email du dresseur depuis les paramètres de requête
    
    // Récupérer tous les pokémons de la base de données
    const allPokemons = await Pokemon.find();
    
    let filteredPokemons = [...allPokemons];
    
    // Filtrage par email du dresseur
    
    filteredPokemons = filteredPokemons.filter(pokemon => 
      pokemon.dresseur.includes(dresseurEmail) // Vérifier si l'email du dresseur est dans le tableau
    );

    // Filtrage par nom et catégorie
    if (searchName && categorie) {
      filteredPokemons = filteredPokemons.filter(pokemon => 
        pokemon.name[language]?.toLowerCase().includes(searchName) && 
        pokemon.type.some(type => type.toLowerCase().includes(categorie.toLowerCase()))
      );
    } else if (searchName) {
      filteredPokemons = filteredPokemons.filter(pokemon => 
        pokemon.name[language]?.toLowerCase().includes(searchName)
      );
    } else if (categorie) {
      filteredPokemons = filteredPokemons.filter(pokemon => 
        pokemon.type.some(type => type.toLowerCase().includes(categorie.toLowerCase()))
      );
    }

    // Renvoyer directement le tableau de pokémons filtrés
    res.json(filteredPokemons);
  } catch (error) {
    console.error('Erreur lors de la récupération des pokémons:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des pokémons', error: error.message });
  }
});



// POST - Créer un nouveau pokémon
router.post('/', auth, async (req, res) => {
  try {
    const userEmail = req.user.email; // Récupérer l'email de l'utilisateur
    const allPokemons = await Pokemon.find();
    let filteredPokemons = allPokemons.filter(pokemon =>
      pokemon.dresseur.includes(userEmail)  // Vérifie que le dresseur actuel possède ce Pokémon
    );
    // Vérifiez si un ID est fourni
    if (!req.body.id) {
      const maxPokemon = await filteredPokemons.findOne().sort({ id: -1 });
      req.body.id = (maxPokemon ? maxPokemon.id : 0) + 1; // Incrémentez l'ID maximum
    }

    // Vérifier si l'ID existe déjà pour le dresseur
    const existingPokemon = await Pokemon.findOne({ 
      id: req.body.id, 
      dresseur: userEmail // Vérifiez si l'email du dresseur est dans la liste des dresseurs
    });
    if (existingPokemon) {
      return res.status(400).json({ message: "Un pokémon avec cet ID existe déjà pour ce dresseur." });
    }

    // S'assurer que le nom est le même dans toutes les langues
    if (req.body.name) {
      if (typeof req.body.name === 'string') {
        const pokemonName = req.body.name;
        req.body.name = {
          english: pokemonName,
          french: pokemonName,
          japanese: pokemonName,
          chinese: pokemonName
        };
      } else if (typeof req.body.name === 'object') {
        const firstNameValue = req.body.name.english || req.body.name.french || 
                               req.body.name.japanese || req.body.name.chinese;
        
        if (firstNameValue) {
          req.body.name = {
            english: firstNameValue,
            french: firstNameValue,
            japanese: firstNameValue,
            chinese: firstNameValue
          };
        } else {
          return res.status(400).json({ message: "Le nom du Pokémon est requis" });
        }
      } else {
        return res.status(400).json({ message: "Format de nom invalide" });
      }
    } else {
      return res.status(400).json({ message: "Le nom du Pokémon est requis" });
    }

    // Corriger la structure des statistiques si nécessaire
    if (req.body.base && req.body.base.Sp) {
      if (req.body.base.Sp[' Attack'] !== undefined) {
        req.body.base['Sp. Attack'] = req.body.base.Sp[' Attack'];
      }
      if (req.body.base.Sp[' Defense'] !== undefined) {
        req.body.base['Sp. Defense'] = req.body.base.Sp[' Defense'];
      }
      delete req.body.base.Sp;
    }

    // Ajouter l'email de l'utilisateur à la liste des dresseurs
    req.body.dresseur = req.body.dresseur || []; // Assurez-vous que dresseurs est un tableau
    req.body.dresseur.push(userEmail); // Ajouter l'email à la liste des dresseurs

    const newPokemon = new Pokemon(req.body);
    await newPokemon.save();
    res.status(201).json(newPokemon);
  } catch (error) {
    console.error('Erreur lors de la création du pokémon:', error);
    res.status(400).json({
      message: "Erreur lors de la création du pokémon",
      error: error.message
    });
  }
});

// PUT - Mettre à jour un pokémon
router.put('/:id', async (req, res) => {
  try {
    // S'assurer que le nom est le même dans toutes les langues si fourni
    if (req.body.name) {
      // Si name est une chaîne de caractères simple
      if (typeof req.body.name === 'string') {
        const pokemonName = req.body.name;
        req.body.name = {
          english: pokemonName,
          french: pokemonName,
          japanese: pokemonName,
          chinese: pokemonName
        };
      } 
      // Si name est déjà un objet mais qu'une seule langue est fournie
      else if (typeof req.body.name === 'object') {
        // Récupérer la première valeur de nom disponible
        const firstNameValue = req.body.name.english || req.body.name.french || 
                               req.body.name.japanese || req.body.name.chinese;
        
        if (firstNameValue) {
          // Appliquer la même valeur à toutes les langues
          req.body.name = {
            english: firstNameValue,
            french: firstNameValue,
            japanese: firstNameValue,
            chinese: firstNameValue
          };
        }
      }
    }

    // Corriger la structure des statistiques si nécessaire
    if (req.body.base && req.body.base.Sp) {
      // Si les statistiques spéciales sont imbriquées sous 'Sp', les extraire
      if (req.body.base.Sp[' Attack'] !== undefined) {
        req.body.base['Sp. Attack'] = req.body.base.Sp[' Attack'];
      }
      if (req.body.base.Sp[' Defense'] !== undefined) {
        req.body.base['Sp. Defense'] = req.body.base.Sp[' Defense'];
      }
      // Supprimer l'objet Sp imbriqué
      delete req.body.base.Sp;
    }

    const updatedPokemon = await Pokemon.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedPokemon) {
      return res.status(404).json({ message: "Pokémon non trouvé" });
    }
    res.status(200).json(updatedPokemon);
  } catch (error) {
    res.status(400).json({
      message: "Erreur lors de la mise à jour du pokémon",
      error: error.message
    });
  }
});

// DELETE - Supprimer un pokémon
router.delete('/:id', async (req, res) => {
  try {
    const deletedPokemon = await Pokemon.findOneAndDelete({ id: req.params.id });
    if (!deletedPokemon) {
      return res.status(404).json({ message: "Pokémon non trouvé" });
    }
    res.status(200).json({
      message: "Pokémon supprimé avec succès",
      pokemon: deletedPokemon
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression du pokémon",
      error: error.message
    });
  }
});

router.post('/giveCard', auth, async (req, res) => {
  try {
    const dresseurEmail = req.user.email;  // Email du dresseur connecté
    const { email, cardId } = req.body;    // Destinataire et ID de la carte

    if (!cardId || !email) {
      return res.status(400).json({ message: "Email ou ID de carte manquant." });
    }

    // Vérification de l'existence du destinataire
    const destinataire = await User.findOne({ email });
    if (!destinataire) {
      return res.status(404).json({ message: "Le destinataire n'existe pas." });
    }

    const allPokemonsdest = await Pokemon.find();
    let userPokemons = allPokemonsdest.filter(pokemon =>
      pokemon.dresseur.includes(email)  // Vérifie que le dresseur actuel possède ce Pokémon
    );
    // Récupérer tous les Pokémon de l'utilisateur qui envoie la carte
  

    // Créer une liste des IDs existants
    const existingIds = userPokemons.map(pokemon => pokemon.id);
    console.log(existingIds);

    // Trouver le plus petit ID disponible supérieur à 0
    let newId = 1;
    while (existingIds.includes(newId)) {
      newId++;
    }

    // Récupérer les Pokémon appartenant au dresseur connecté
    const allPokemons = await Pokemon.find();
    let filteredPokemons = allPokemons.filter(pokemon =>
      pokemon.dresseur.includes(dresseurEmail)  // Vérifie que le dresseur actuel possède ce Pokémon
    );

    // Filtrer par ID de la carte
    filteredPokemons = filteredPokemons.filter(pokemon =>
      pokemon.id === parseInt(cardId)
    );

    if (filteredPokemons.length === 0) {
      return res.status(403).json({ message: "Vous n'avez pas cette carte." });
    }

    // ✔️ OK : on peut transférer
    const pokemonToUpdate = filteredPokemons[0];

    // Vider la liste des dresseurs et ajouter uniquement le nouveau dresseur
    pokemonToUpdate.dresseur = [email];  // Le seul dresseur est maintenant le destinataire
    pokemonToUpdate.id = newId; // Attribuer le nouvel ID

    // Mettre à jour également le nom du dresseur dans le Pokémon
    pokemonToUpdate.dresseurName = destinataire.name;  // Mettre à jour le nom du dresseur
    
    // Sauvegarder les modifications dans la base de données
    await pokemonToUpdate.save();

    return res.status(200).json({
      message: "Carte transférée avec succès.",
      card: pokemonToUpdate
    });

  } catch (error) {
    console.error("Erreur lors du giveCard :", error);
    res.status(500).json({ message: "Erreur serveur lors du traitement de la carte." });
  }
});


export default router; 
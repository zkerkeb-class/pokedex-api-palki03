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
     const dresseurEmail = req.user.email; 
    

    const allPokemons = await Pokemon.find();
    
    let filteredPokemons = [...allPokemons];
    

    
    filteredPokemons = filteredPokemons.filter(pokemon => 
      pokemon.dresseur.includes(dresseurEmail) 
    );


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

  
    res.json(filteredPokemons);
  } catch (error) {
    console.error('Erreur lors de la récupération des pokémons:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des pokémons', error: error.message });
  }
});




router.post('/', auth, async (req, res) => {
  try {
    const userEmail = req.user.email; // Récupérer l'email de l'utilisateur
    const allPokemons = await Pokemon.find();
   
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

    if (req.body.base && req.body.base.Sp) {
      if (req.body.base.Sp[' Attack'] !== undefined) {
        req.body.base['Sp. Attack'] = req.body.base.Sp[' Attack'];
      }
      if (req.body.base.Sp[' Defense'] !== undefined) {
        req.body.base['Sp. Defense'] = req.body.base.Sp[' Defense'];
      }
      delete req.body.base.Sp;
    }

   
    req.body.dresseur = req.body.dresseur || [];
    req.body.dresseur.push(userEmail);

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

router.put('/:id/:lang', auth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    console.log("Dresseur authentifié:", userEmail); 
    console.log("reqparams.id", req.params.id);

    // Récupère tous les Pokémons
    const allPokemons = await Pokemon.find();

    // Filtre les Pokémons du dresseur authentifié
    let filteredPokemons = allPokemons.filter(pokemon => pokemon.dresseur.includes(userEmail));

    // Filtrer le Pokémon avec l'ID donné
    const pokemonToUpdate = filteredPokemons.find(pokemon => pokemon.id === parseInt(req.params.id));

    // Si le Pokémon n'est pas trouvé
    if (!pokemonToUpdate) {
      return res.status(404).json({ message: "Pokémon non trouvé ou vous n'êtes pas autorisé à modifier ce Pokémon" });
    }

    console.log("Pokémon à mettre à jour:", pokemonToUpdate);

    // Crée l'objet de données à mettre à jour
    const updatedData = { ...pokemonToUpdate.toObject(), ...req.body };

    // Si un nom est fourni et est un objet, on le met à jour
    if (req.body.name && typeof req.body.name === 'object') {
      updatedData.name = {
        ...pokemonToUpdate.name?.toObject?.() || {},
        ...req.body.name
      };
    }

    // Si la base contient des valeurs de Sp. Attack ou Sp. Defense, on les met à jour
    if (req.body.base && req.body.base.Sp) {
      if (req.body.base.Sp[' Attack'] !== undefined) {
        updatedData.base['Sp. Attack'] = req.body.base.Sp[' Attack'];
      }
      if (req.body.base.Sp[' Defense'] !== undefined) {
        updatedData.base['Sp. Defense'] = req.body.base.Sp[' Defense'];
      }
      delete updatedData.base.Sp;  // Supprime la clé Sp de l'objet base
    }

    // Mise à jour du Pokémon dans la base de données
    const updatedPokemon = await Pokemon.findOneAndUpdate(
      { _id: pokemonToUpdate._id }, // Utilise _id de l'objet, pas du tableau
      updatedData,
      { new: true, runValidators: true } // Retourne le document mis à jour
    );

    // Si la mise à jour réussie
    res.status(200).json(updatedPokemon);

  } catch (error) {
    console.error("Erreur lors de la mise à jour:", error.message);
    res.status(400).json({
      message: "Erreur lors de la mise à jour du Pokémon",
      error: error.message
    });
  }
});





router.delete('/:id', auth, async (req, res) => {
  try {
    console.log("delete");
    const allPokemons = await Pokemon.find();
    
    const dresseurEmail = req.user.email;
    let filteredPokemons = [...allPokemons];
    console.log(dresseurEmail);
    console.log(req.params.id);
    filteredPokemons = filteredPokemons.filter(pokemon => 
      pokemon.dresseur.includes(dresseurEmail));
    filteredPokemons = await Pokemon.findOne({ id: req.params.id });
    console.log(filteredPokemons._id);
    await Pokemon.deleteOne({_id: filteredPokemons._id});
    res.status(200).json({
      message: "Pokémon supprimé avec succès",
      pokemon: filteredPokemons
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
    const dresseurEmail = req.user.email; 
    const { email, cardId } = req.body;   

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
      pokemon.dresseur.includes(email) 
    );
    const existingIds = userPokemons.map(pokemon => pokemon.id);
    console.log(existingIds);

    let newId = 1;
    while (existingIds.includes(newId)) {
      newId++;
    }

    const allPokemons = await Pokemon.find();
    let filteredPokemons = allPokemons.filter(pokemon =>
      pokemon.dresseur.includes(dresseurEmail)  
    );
    filteredPokemons = filteredPokemons.filter(pokemon =>
      pokemon.id === parseInt(cardId)
    );

    if (filteredPokemons.length === 0) {
      return res.status(403).json({ message: "Vous n'avez pas cette carte." });
    }

    const pokemonToUpdate = filteredPokemons[0];
    pokemonToUpdate.dresseur = [email];  
    pokemonToUpdate.id = newId; 
    pokemonToUpdate.dresseurName = destinataire.name;  
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
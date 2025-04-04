import express from 'express';
import Pokemon from '../model/Pokemon.js'; // Assurez-vous que le chemin est correct

const router = express.Router();

// GET - Récupérer tous les pokémons avec filtrage
router.get('/', async (req, res) => {
  try {
    const searchName = req.query?.searchname?.toLowerCase();  
    const language = req.query?.lang?.toLowerCase() || 'french'; 
    const categorie = req.query?.categorie;
    
    // Récupérer tous les pokémons de la base de données
    const allPokemons = await Pokemon.find();
    
    let filteredPokemons = [...allPokemons];
    
    if (searchName && categorie) {
      filteredPokemons = allPokemons.filter(pokemon => 
        pokemon.name[language]?.toLowerCase().includes(searchName) && 
        pokemon.type.some(type => type.toLowerCase().includes(categorie.toLowerCase()))
      );
    } else if (searchName) {
      filteredPokemons = allPokemons.filter(pokemon => 
        pokemon.name[language]?.toLowerCase().includes(searchName)
      );
    } else if (categorie) {
      filteredPokemons = allPokemons.filter(pokemon => 
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
router.post('/', async (req, res) => {
  try {
    // Vérifiez si un ID est fourni
    if (!req.body.id) {
      // Si aucun ID n'est fourni, générez un nouvel ID
      const maxPokemon = await Pokemon.findOne().sort({ id: -1 });
      req.body.id = (maxPokemon ? maxPokemon.id : 0) + 1; // Incrémentez l'ID maximum
    }

    // Vérifier si l'ID existe déjà
    const existingPokemon = await Pokemon.findOne({ id: req.body.id });
    if (existingPokemon) {
      return res.status(400).json({ message: "Un pokémon avec cet ID existe déjà" });
    }

    // S'assurer que le nom est le même dans toutes les langues
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

    const newPokemon = new Pokemon(req.body);
    await newPokemon.save();
    res.status(201).json(newPokemon);
  } catch (error) {
    console.error('Erreur lors de la création du pokémon:', error); // Log de l'erreur
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

export default router; 
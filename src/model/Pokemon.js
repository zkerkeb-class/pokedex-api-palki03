import mongoose from 'mongoose';

const pokemonSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    
  },
  name: {
    english: { type: String, required: true },
    japanese: { type: String, required: true },
    chinese: { type: String, required: true },
    french: { type: String, required: true },
  },
  type: {
    type: [String],
    required: true,
  },
  base: {
    HP: { type: Number, required: true },
    Attack: { type: Number, required: true },
    Defense: { type: Number, required: true },
    'Sp. Attack': { type: Number, required: true },
    'Sp. Defense': { type: Number, required: true },
    Speed: { type: Number, required: true },
  },
  image: { 
    type: String,
    default: function() {
      return `/assets/pokemons/${this.id}.png`;
    }
  },
  stats: {
    hp: Number,
    attack: Number,
    defense: Number,
    specialAttack: Number,
    specialDefense: Number,
    speed: Number
  },
  evolutions: [{
    type: Number,
    ref: 'Pokemon'
  }],
  dresseur:[{
    type: [String],
    ref: 'Dresseur'
  }]
}, {
  collection: 'Pokemondb',
  timestamps: true
});

const Pokemon = mongoose.model('Pokemon', pokemonSchema);

export default Pokemon;

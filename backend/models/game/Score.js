const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  score: { 
    type: Number, 
    required: true 
  },
  accuracy: { 
    type: Number,
    min: 0,
    max: 100,
    required: true 
  },
  gameMode: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'], 
    required: true 
  },
  timePlayed: { 
    type: Number, // time in seconds
    required: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Score || mongoose.model('Score', scoreSchema);

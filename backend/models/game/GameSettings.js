const mongoose = require('mongoose');

const gameSettingsSchema = new mongoose.Schema({
  mode: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    unique: true, 
    required: true 
  },
  targetSpeed: { 
    type: Number,
    required: true 
  },
  targetSize: { 
    type: Number,
    required: true 
  },
  targetCount: { 
    type: Number,
    required: true 
  },
  gameTimeSeconds: { 
    type: Number,
    required: true 
  },
  pointsPerHit: { 
    type: Number,
    required: true 
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.GameSettings || mongoose.model('GameSettings', gameSettingsSchema);

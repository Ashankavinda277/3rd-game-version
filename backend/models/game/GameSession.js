const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  playerName: {
    type: String,
    required: true
  },
  gameMode: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  currentScore: {
    type: Number,
    default: 0
  },
  hitCount: {
    type: Number,
    default: 0
  },
  missCount: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  gameSettings: {
    duration: {
      type: Number,
      default: 60 // seconds
    },
    targetCount: {
      type: Number,
      default: 10
    },
    pointsPerHit: {
      type: Number,
      default: 10
    }
  },
  hits: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    targetId: {
      type: Number,
      default: 0
    },
    points: {
      type: Number,
      default: 10
    },
    accuracy: {
      type: Number,
      default: 100
    },
    zone: {
      type: String,
      enum: ['bullseye', 'inner', 'outer', 'center'],
      default: 'center'
    }
  }]
}, {
  timestamps: true
});

// Calculate accuracy before saving
gameSessionSchema.pre('save', function(next) {
  const totalShots = this.hitCount + this.missCount;
  if (totalShots > 0) {
    this.accuracy = Math.round((this.hitCount / totalShots) * 100);
  }
  next();
});

// Method to add a hit
gameSessionSchema.methods.addHit = function(hitData) {
  this.hits.push({
    timestamp: new Date(),
    targetId: hitData.targetId || 0,
    points: hitData.points || 10,
    accuracy: hitData.accuracy || 100,
    zone: hitData.zone || 'center'
  });
  
  this.hitCount += 1;
  this.currentScore += hitData.points || 10;
  
  return this.save();
};

// Method to add a miss
gameSessionSchema.methods.addMiss = function() {
  this.missCount += 1;
  return this.save();
};

// Method to end the game session
gameSessionSchema.methods.endSession = function() {
  this.endTime = new Date();
  this.isActive = false;
  return this.save();
};

module.exports = mongoose.models.GameSession || mongoose.model('GameSession', gameSessionSchema);

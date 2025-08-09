const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Game Settings Model
const GameSettings = require('./models/game/GameSettings');

// Initialize game settings with the specified time limits
const initializeGameSettings = async () => {
  try {
    const gameSettings = [
      {
        mode: 'easy',
        targetSpeed: 2, // Slow target movement
        targetSize: 80, // Larger targets
        targetCount: 8, // Fewer targets
        gameTimeSeconds: 90, // 90 seconds for easy mode
        pointsPerHit: 10,
        isActive: true
      },
      {
        mode: 'medium', 
        targetSpeed: 4, // Medium target movement
        targetSize: 60, // Medium targets
        targetCount: 12, // Medium target count
        gameTimeSeconds: 60, // 60 seconds for medium mode
        pointsPerHit: 15,
        isActive: true
      },
      {
        mode: 'hard',
        targetSpeed: 6, // Fast target movement  
        targetSize: 40, // Smaller targets
        targetCount: 15, // More targets
        gameTimeSeconds: 45, // 45 seconds for hard mode
        pointsPerHit: 20,
        isActive: true
      }
    ];

    console.log('🎯 Initializing game settings...');

    for (const setting of gameSettings) {
      const existingSetting = await GameSettings.findOneAndUpdate(
        { mode: setting.mode },
        setting,
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`✅ ${setting.mode.toUpperCase()} mode: ${setting.gameTimeSeconds} seconds`);
    }

    console.log('🎉 Game settings initialized successfully!');
    console.log('📝 Time limits set:');
    console.log('   • Easy: 90 seconds');
    console.log('   • Medium: 60 seconds'); 
    console.log('   • Hard: 45 seconds');

  } catch (error) {
    console.error('❌ Error initializing game settings:', error);
  }
};

// Run the initialization
const main = async () => {
  await connectDB();
  await initializeGameSettings();
  mongoose.connection.close();
  console.log('🔒 Database connection closed');
};

main();

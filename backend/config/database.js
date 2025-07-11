// Database configuration
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
  try {
    // Try connecting to MongoDB Atlas first if URI is provided
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('MongoDB Atlas connected');
      return;
    }
    
    // Try local MongoDB if no Atlas URI is provided
    console.log('No MongoDB Atlas URI found, attempting to connect to local MongoDB server...');
    await mongoose.connect('mongodb://localhost:27017/shooting_gallery');
    console.log('Local MongoDB connected');
  } catch (error) {
    console.warn('MongoDB connection error:', error.message);
    console.log('Running without database connection. Some features may not work.');
    console.log('To fix this:');
    console.log('1. Install and start MongoDB locally, or');
    console.log('2. Check your MongoDB Atlas credentials in the .env file');
    
    // Don't exit the process, let the app run without database for development
    // process.exit(1);
  }
};

module.exports = connectDB;
 
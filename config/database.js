const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection (optional for development)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reviewgen';

// Only connect to MongoDB if it's available
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.warn('⚠️  MongoDB connection failed, running without database');
    console.warn('   To enable database features, start MongoDB with: sudo service mongodb start');
  }
};

// Review Schema and Model
const reviewSchema = new mongoose.Schema({
  review: { type: String, required: true },
  sentiment: { type: String, required: true },
  aiResponse: { type: String },
  createdAt: { type: Date, default: Date.now },
  handledBy: { type: String, default: 'AI' },
  type: { type: String, default: 'customer_service' },
  extra: { type: mongoose.Schema.Types.Mixed }, // for any extra data
});

const Review = mongoose.model('Review', reviewSchema);

// Event listeners
mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.warn('⚠️  MongoDB connection error:', err.message);
});

module.exports = {
  connectToMongoDB,
  Review,
  mongoose
}; 
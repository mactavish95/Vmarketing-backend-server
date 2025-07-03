const express = require('express');
const router = express.Router();
const { Review, mongoose } = require('../config/database');

// Fetch all reviews and customer service responses
router.get('/reviews', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const reviews = await Review.find().sort({ createdAt: -1 });
      res.json({ success: true, reviews });
    } else {
      res.json({ 
        success: true, 
        reviews: [],
        message: 'Database not available. Start MongoDB with: sudo service mongodb start'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
  }
});

module.exports = router; 
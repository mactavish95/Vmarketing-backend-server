const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    apiKeyConfigured: !!process.env.NVIDIA_API_KEY,
    apiKeyLength: process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.length : 0
  });
});

module.exports = router; 
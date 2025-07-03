const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import modules
const { connectToMongoDB } = require('./config/database');
const { 
  securityMiddleware, 
  limiter, 
  corsOptions, 
  compressionMiddleware, 
  loggingMiddleware 
} = require('./middleware/security');

// Import routes
const llamaRoutes = require('./routes/llama');
const voiceRoutes = require('./routes/voice');
const reviewsRoutes = require('./routes/reviews');
const healthRoutes = require('./routes/health');
const enhancedLLMRoutes = require('./routes/enhancedLLM');
const modelsRoutes = require('./routes/models');
const blogRoutes = require('./routes/blog');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting (fixes X-Forwarded-For warning)
app.set('trust proxy', 1);

// Connect to MongoDB
connectToMongoDB();

// Apply security middleware
app.use(securityMiddleware);

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Apply CORS
app.use(cors(corsOptions));

// Apply compression
app.use(compressionMiddleware);

// Apply logging
app.use(loggingMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount routes
app.use('/api', llamaRoutes);
app.use('/api', voiceRoutes);
app.use('/api', reviewsRoutes);
app.use('/api', healthRoutes);
app.use('/api', enhancedLLMRoutes);
app.use('/api', modelsRoutes);
app.use('/api', blogRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

// Only start the server if not running in a Firebase Cloud Function
defineAppStart();

function defineAppStart() {
  if (require.main === module) {
    app.listen(PORT, () => {
      console.log(`🚀 ReviewGen Backend Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🤖 Llama API: http://localhost:${PORT}/api/llama`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      if (!process.env.NVIDIA_API_KEY) {
        console.warn('⚠️  NVIDIA_API_KEY not found in environment variables');
      }
    });
  }
}

// Export the app for Firebase Functions
module.exports = app;

// If running in Firebase Functions, create the HTTPS function entry point
if (process.env.FUNCTION_NAME || process.env.K_SERVICE) {
  const functions = require('firebase-functions');
  exports.api = functions.https.onRequest(app);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
}); 
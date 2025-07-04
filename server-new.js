const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import modules with error handling
let connectToMongoDB;
let securityMiddleware, limiter, corsOptions, compressionMiddleware, loggingMiddleware;
let llamaRoutes, voiceRoutes, reviewsRoutes, healthRoutes, enhancedLLMRoutes, modelsRoutes, blogRoutes;

try {
  const database = require('./config/database');
  connectToMongoDB = database.connectToMongoDB;
  console.log('✅ Database module loaded');
} catch (error) {
  console.error('❌ Error loading database module:', error.message);
}

try {
  const security = require('./middleware/security');
  securityMiddleware = security.securityMiddleware;
  limiter = security.limiter;
  corsOptions = security.corsOptions;
  compressionMiddleware = security.compressionMiddleware;
  loggingMiddleware = security.loggingMiddleware;
  console.log('✅ Security middleware loaded');
} catch (error) {
  console.error('❌ Error loading security middleware:', error.message);
}

// Import routes with error handling
try {
  llamaRoutes = require('./routes/llama');
  console.log('✅ Llama routes loaded');
} catch (error) {
  console.error('❌ Error loading llama routes:', error.message);
}

try {
  voiceRoutes = require('./routes/voice');
  console.log('✅ Voice routes loaded');
} catch (error) {
  console.error('❌ Error loading voice routes:', error.message);
}

try {
  reviewsRoutes = require('./routes/reviews');
  console.log('✅ Reviews routes loaded');
} catch (error) {
  console.error('❌ Error loading reviews routes:', error.message);
}

try {
  healthRoutes = require('./routes/health');
  console.log('✅ Health routes loaded');
} catch (error) {
  console.error('❌ Error loading health routes:', error.message);
}

try {
  enhancedLLMRoutes = require('./routes/enhancedLLM');
  console.log('✅ Enhanced LLM routes loaded');
} catch (error) {
  console.error('❌ Error loading enhanced LLM routes:', error.message);
}

try {
  modelsRoutes = require('./routes/models');
  console.log('✅ Models routes loaded');
} catch (error) {
  console.error('❌ Error loading models routes:', error.message);
}

try {
  blogRoutes = require('./routes/blog');
  console.log('✅ Blog routes loaded');
} catch (error) {
  console.error('❌ Error loading blog routes:', error.message);
}

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

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Test endpoint to verify server is working
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount routes with error handling
const routesToMount = [
  { name: 'llama', route: llamaRoutes },
  { name: 'voice', route: voiceRoutes },
  { name: 'reviews', route: reviewsRoutes },
  { name: 'health', route: healthRoutes },
  { name: 'enhancedLLM', route: enhancedLLMRoutes },
  { name: 'models', route: modelsRoutes },
  { name: 'blog', route: blogRoutes }
];

routesToMount.forEach(({ name, route }) => {
  if (route) {
    try {
      app.use('/api', route);
      console.log(`✅ ${name} routes mounted successfully`);
    } catch (error) {
      console.error(`❌ Error mounting ${name} routes:`, error.message);
    }
  } else {
    console.warn(`⚠️ ${name} routes not available`);
  }
});

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
const express = require('express');
const router = express.Router();
const llamaService = require('../services/llamaService');
const { Review, mongoose } = require('../config/database');

// Voice Analysis endpoint using NVIDIA Llama
router.post('/voice/analyze', async (req, res) => {
  try {
    const { transcript, apiKey } = req.body;
    
    // Input validation
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required and must be a string',
        code: 'INVALID_INPUT'
      });
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'API key is required and must be a string',
        code: 'INVALID_API_KEY'
      });
    }

    // Text length validation
    if (transcript.length > 4000) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is too long. Maximum 4000 characters allowed.',
        code: 'TEXT_TOO_LONG'
      });
    }

    // Sanitize input
    const sanitizedTranscript = transcript.trim().replace(/[<>]/g, '');

    console.log(`Processing voice analysis: ${sanitizedTranscript.substring(0, 100)}...`);

    const result = await llamaService.analyzeVoiceInput(sanitizedTranscript, apiKey);
    
    console.log(`Voice analysis generated. Tokens used: ${result.usage?.total_tokens || 'unknown'}`);

    res.json(result);

  } catch (error) {
    console.error('Voice Analysis Error:', error);
    
    // Handle specific error types
    if (error.status === 401 || error.code === 'authentication_error') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing NVIDIA API key. Please check your API key configuration.',
        code: 'INVALID_API_KEY'
      });
    }

    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        success: false,
        error: 'API quota exceeded. Please try again later.',
        code: 'QUOTA_EXCEEDED'
      });
    }

    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Failed to analyze voice input',
      code: 'ANALYSIS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Voice Review Generation endpoint
router.post('/voice/generate-review', async (req, res) => {
  try {
    const { transcript, analysis, apiKey, reviewType = 'general' } = req.body;
    
    // Debug logging
    console.log('Voice review generation request received:');
    console.log('- transcript length:', transcript?.length || 0);
    console.log('- has analysis:', !!analysis);
    console.log('- has apiKey:', !!apiKey);
    console.log('- reviewType:', reviewType);
    console.log('- full request body:', JSON.stringify(req.body, null, 2));
    
    // Input validation
    if (!transcript || typeof transcript !== 'string') {
      console.log('❌ Validation failed: transcript missing or invalid');
      return res.status(400).json({
        success: false,
        error: 'Transcript is required and must be a string',
        code: 'INVALID_INPUT'
      });
    }

    if (!apiKey || typeof apiKey !== 'string') {
      console.log('❌ Validation failed: API key missing or invalid');
      return res.status(400).json({
        success: false,
        error: 'API key is required and must be a string',
        code: 'INVALID_API_KEY'
      });
    }

    // Text length validation
    if (transcript.length > 4000) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is too long. Maximum 4000 characters allowed.',
        code: 'TEXT_TOO_LONG'
      });
    }

    // Sanitize input
    const sanitizedTranscript = transcript.trim().replace(/[<>]/g, '');

    console.log(`Generating review from voice input: ${sanitizedTranscript.substring(0, 100)}...`);

    const result = await llamaService.generateReviewFromVoice(sanitizedTranscript, apiKey, reviewType);

    // Save to MongoDB (if available)
    if (mongoose.connection.readyState === 1) {
      try {
        await Review.create({
          review: transcript,
          sentiment: analysis?.sentiment || 'unknown',
          aiResponse: result.review,
          handledBy: 'AI',
          type: 'voice_review',
          extra: { analysis, reviewType, apiKey: apiKey ? 'provided' : undefined }
        });
        console.log('💾 Review saved to database');
      } catch (dbError) {
        console.warn('⚠️  Failed to save to database:', dbError.message);
      }
    } else {
      console.log('💾 Database not available, skipping save');
    }

    console.log(`Review generated. Tokens used: ${result.usage?.total_tokens || 'unknown'}`);

    res.json(result);

  } catch (error) {
    console.error('Review Generation Error:', error);
    
    // Handle specific error types
    if (error.status === 401 || error.code === 'authentication_error') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing NVIDIA API key. Please check your API key configuration.',
        code: 'INVALID_API_KEY'
      });
    }

    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        success: false,
        error: 'API quota exceeded. Please try again later.',
        code: 'QUOTA_EXCEEDED'
      });
    }

    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Failed to generate review from voice input',
      code: 'REVIEW_GENERATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Location Suggestion endpoint
router.post('/voice/suggest-location', async (req, res) => {
  try {
    const { transcript, apiKey, currentLocation = null } = req.body;
    
    // Debug logging
    console.log('Location suggestion request received:');
    console.log('- transcript length:', transcript?.length || 0);
    console.log('- has apiKey:', !!apiKey);
    console.log('- has currentLocation:', !!currentLocation);
    
    // Input validation
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required and must be a string',
        code: 'INVALID_INPUT'
      });
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'API key is required and must be a string',
        code: 'INVALID_API_KEY'
      });
    }

    // Text length validation
    if (transcript.length > 4000) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is too long. Maximum 4000 characters allowed.',
        code: 'TEXT_TOO_LONG'
      });
    }

    // Sanitize input
    const sanitizedTranscript = transcript.trim().replace(/[<>]/g, '');

    console.log(`Analyzing transcript for location suggestions: ${sanitizedTranscript.substring(0, 100)}...`);

    const result = await llamaService.generateLocationSuggestions(sanitizedTranscript, apiKey, currentLocation);
    
    console.log(`Location suggestions generated. Tokens used: ${result.usage?.total_tokens || 'unknown'}`);

    res.json(result);

  } catch (error) {
    console.error('Location Suggestion Error:', error);
    
    // Handle specific error types
    if (error.status === 401 || error.code === 'authentication_error') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing NVIDIA API key. Please check your API key configuration.',
        code: 'INVALID_API_KEY'
      });
    }

    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        success: false,
        error: 'API quota exceeded. Please try again later.',
        code: 'QUOTA_EXCEEDED'
      });
    }

    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Failed to generate location suggestions',
      code: 'LOCATION_SUGGESTION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Customer Service Agent for Negative Reviews
router.post('/voice/customer-service-response', async (req, res) => {
  try {
    const { review, sentiment, apiKey } = req.body;

    if (!review || typeof review !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Review is required and must be a string',
        code: 'INVALID_INPUT'
      });
    }
    if (!sentiment || typeof sentiment !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Sentiment is required and must be a string',
        code: 'INVALID_INPUT'
      });
    }
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'API key is required and must be a string',
        code: 'INVALID_API_KEY'
      });
    }

    if (sentiment.toLowerCase() !== 'negative') {
      return res.json({
        success: true,
        message: 'No customer service response needed for non-negative sentiment.',
        response: null
      });
    }

    const result = await llamaService.generateCustomerServiceResponse(review, apiKey);

    // Save to MongoDB (if available)
    if (mongoose.connection.readyState === 1) {
      try {
        await Review.create({
          review,
          sentiment,
          aiResponse: result.response,
          handledBy: 'AI',
          type: 'customer_service',
          extra: { apiKey: apiKey ? 'provided' : undefined }
        });
        console.log('💾 Customer service response saved to database');
      } catch (dbError) {
        console.warn('⚠️  Failed to save to database:', dbError.message);
      }
    } else {
      console.log('💾 Database not available, skipping save');
    }

    res.json(result);
  } catch (error) {
    console.error('Customer Service Agent Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate customer service response',
      code: 'CUSTOMER_SERVICE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router; 
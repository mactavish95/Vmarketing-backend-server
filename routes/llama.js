const express = require('express');
const router = express.Router();
const llamaService = require('../services/llamaService');
const { Review, mongoose } = require('../config/database');

// NVIDIA Llama API endpoint
router.post('/llama', async (req, res) => {
  try {
    const { text, prompt, apiKey, conversationHistory = [] } = req.body;
    
    // Accept both 'text' and 'prompt' parameters for compatibility
    const inputText = text || prompt;
    
    // Input validation
    if (!inputText || typeof inputText !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text/prompt input is required and must be a string',
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
    if (inputText.length > 4000) {
      return res.status(400).json({
        success: false,
        error: 'Text input is too long. Maximum 4000 characters allowed.',
        code: 'TEXT_TOO_LONG'
      });
    }

    // Sanitize input
    const sanitizedText = inputText.trim().replace(/[<>]/g, '');

    console.log(`Processing conversational request: ${sanitizedText.substring(0, 100)}...`);

    const result = await llamaService.generateConversationalResponse(sanitizedText, apiKey, conversationHistory);
    
    console.log(`Conversational response generated. Tokens used: ${result.usage?.total_tokens || 'unknown'}`);

    res.json(result);

  } catch (error) {
    console.error('Llama API Error:', error);
    console.error('Error details:', {
      status: error.status,
      code: error.code,
      message: error.message,
      stack: error.stack
    });

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
      error: 'Failed to generate conversational response',
      code: 'LLAMA_API_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router; 
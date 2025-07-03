const express = require('express');
const router = express.Router();
const enhancedLLMService = require('../services/enhancedLLMService');
const ResponseQualityAnalyzer = require('../utils/responseQualityAnalyzer');
const { Review, mongoose } = require('../config/database');

// Initialize response quality analyzer
const qualityAnalyzer = new ResponseQualityAnalyzer();

// Enhanced LLM endpoint with multi-model support and quality analysis
router.post('/enhanced-llm', async (req, res) => {
  try {
    const { text, prompt, apiKey, conversationHistory = [], context = {} } = req.body;
    
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

    console.log(`🎯 Processing enhanced LLM request: ${sanitizedText.substring(0, 100)}...`);

    // Generate enhanced response using multi-model approach
    const result = await enhancedLLMService.generateEnhancedResponse(sanitizedText, apiKey, context);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    // Analyze response quality
    const qualityAnalysis = qualityAnalyzer.analyzeResponseQuality(
      result.response, 
      result.analysis.contentType, 
      context
    );

    console.log(`✅ Enhanced response generated with quality score: ${qualityAnalysis.overallScore.toFixed(2)}`);
    console.log(`🤖 Model used: ${result.model}`);
    console.log(`📊 Content type: ${result.analysis.contentType}`);

    // Save to MongoDB if available
    if (mongoose.connection.readyState === 1) {
      try {
        await Review.create({
          review: sanitizedText,
          sentiment: result.analysis.sentiment,
          aiResponse: result.response,
          handledBy: 'Enhanced AI',
          type: 'enhanced_llm',
          extra: { 
            model: result.model,
            qualityScore: qualityAnalysis.overallScore,
            contentType: result.analysis.contentType,
            confidence: result.confidence,
            qualityAnalysis: qualityAnalysis
          }
        });
        console.log('💾 Enhanced response saved to database');
      } catch (dbError) {
        console.warn('⚠️  Failed to save to database:', dbError.message);
      }
    }

    res.json({
      success: true,
      response: result.response,
      analysis: result.analysis,
      model: result.model,
      strategy: result.strategy,
      confidence: result.confidence,
      qualityAnalysis: qualityAnalysis,
      timestamp: result.timestamp
    });

  } catch (error) {
    console.error('Enhanced LLM Error:', error);
    
    // Handle specific error types
    if (error.status === 401 || error.code === 'authentication_error') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing API key. Please check your API key configuration.',
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
      error: 'Failed to generate enhanced response',
      code: 'ENHANCED_LLM_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Response quality analysis endpoint
router.post('/analyze-response-quality', async (req, res) => {
  try {
    const { response, contentType = 'general', context = {} } = req.body;
    
    // Input validation
    if (!response || typeof response !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Response text is required and must be a string',
        code: 'INVALID_INPUT'
      });
    }

    // Analyze response quality
    const qualityAnalysis = qualityAnalyzer.analyzeResponseQuality(response, contentType, context);

    console.log(`📊 Response quality analyzed. Score: ${qualityAnalysis.overallScore.toFixed(2)}`);

    res.json({
      success: true,
      qualityAnalysis: qualityAnalysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Response Quality Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze response quality',
      code: 'QUALITY_ANALYSIS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Model comparison endpoint
router.post('/compare-models', async (req, res) => {
  try {
    const { text, apiKey, context = {} } = req.body;
    
    // Input validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text input is required and must be a string',
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

    console.log(`🔄 Comparing models for: ${text.substring(0, 100)}...`);

    // Analyze input to determine optimal model
    const analysis = await enhancedLLMService.analyzeInputAndSelectModel(text, context);
    
    // Generate responses with different models for comparison
    const modelComparison = {
      input: text,
      analysis: analysis.analysis,
      recommendedModel: analysis.selectedModel.name,
      confidence: analysis.confidence,
      comparisons: []
    };

    // Test with different models (if API keys are available)
    const modelsToTest = ['llama']; // Start with Llama as it's the primary model
    
    for (const modelKey of modelsToTest) {
      try {
        const model = enhancedLLMService.models[modelKey];
        const result = await enhancedLLMService.generateEnhancedResponse(text, apiKey, {
          ...context,
          forceModel: modelKey
        });
        
        if (result.success) {
          const qualityAnalysis = qualityAnalyzer.analyzeResponseQuality(
            result.response, 
            result.analysis.contentType, 
            context
          );

          modelComparison.comparisons.push({
            model: model.name,
            response: result.response,
            qualityScore: qualityAnalysis.overallScore,
            strengths: qualityAnalysis.strengths,
            weaknesses: qualityAnalysis.weaknesses,
            suggestions: qualityAnalysis.suggestions
          });
        }
      } catch (error) {
        console.warn(`⚠️  Failed to test model ${modelKey}:`, error.message);
      }
    }

    console.log(`✅ Model comparison completed. ${modelComparison.comparisons.length} models tested`);

    res.json({
      success: true,
      comparison: modelComparison,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Model Comparison Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compare models',
      code: 'MODEL_COMPARISON_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get available models and their capabilities
router.get('/available-models', (req, res) => {
  try {
    const models = Object.keys(enhancedLLMService.models).map(key => {
      const model = enhancedLLMService.models[key];
      return {
        key: key,
        name: model.name,
        strengths: model.strengths,
        temperature: model.temperature,
        maxTokens: model.maxTokens
      };
    });

    res.json({
      success: true,
      models: models,
      responsePatterns: enhancedLLMService.responsePatterns,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Available Models Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available models',
      code: 'MODELS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;

 
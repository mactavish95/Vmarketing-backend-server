const express = require('express');
const router = express.Router();

// Model configurations for different use cases
const modelConfigurations = {
    models: [
        {
            key: 'llama-review',
            name: 'Meta Llama 3.1 70B',
            useCase: 'review_generation',
            description: 'Specialized for generating authentic, engaging reviews with natural language flow',
            strengths: ['Natural Language', 'Context Awareness', 'Authentic Tone'],
            temperature: 0.8,
            maxTokens: 2048,
            provider: 'NVIDIA'
        },
        {
            key: 'llama-customer-service',
            name: 'Meta Llama 3.1 70B',
            useCase: 'customer_service',
            description: 'Optimized for empathetic customer service responses and conflict resolution',
            strengths: ['Empathy', 'Professional Tone', 'Problem Solving'],
            temperature: 0.6,
            maxTokens: 1536,
            provider: 'NVIDIA'
        },
        {
            key: 'llama-voice-analysis',
            name: 'Meta Llama 3.1 70B',
            useCase: 'voice_analysis',
            description: 'Advanced voice transcript analysis with sentiment detection and key point extraction',
            strengths: ['Sentiment Analysis', 'Key Point Extraction', 'Context Understanding'],
            temperature: 0.4,
            maxTokens: 3072,
            provider: 'NVIDIA'
        },
        {
            key: 'gpt4-analysis',
            name: 'GPT-4',
            useCase: 'detailed_analysis',
            description: 'High-performance analysis and reasoning for complex content evaluation',
            strengths: ['Reasoning', 'Structured Analysis', 'Technical Accuracy'],
            temperature: 0.3,
            maxTokens: 4000,
            provider: 'OpenAI'
        },
        {
            key: 'claude-customer-service',
            name: 'Claude 3 Sonnet',
            useCase: 'customer_service',
            description: 'Empathetic customer service with advanced understanding of customer needs',
            strengths: ['Empathy', 'Customer Focus', 'Detailed Responses'],
            temperature: 0.5,
            maxTokens: 4000,
            provider: 'Anthropic'
        }
    ],
    useCases: {
        review_generation: 'Generate authentic, engaging reviews from user input or voice transcripts',
        customer_service: 'Create empathetic, professional responses to customer feedback and complaints',
        voice_analysis: 'Analyze voice transcripts for sentiment, key points, and actionable insights',
        detailed_analysis: 'Perform comprehensive content analysis with structured reasoning and insights'
    }
};

// GET /api/models - Return all model configurations
router.get('/models', (req, res) => {
    try {
        res.json({
            success: true,
            models: modelConfigurations.models,
            useCases: modelConfigurations.useCases,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Models endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch model configurations',
            code: 'MODELS_ERROR'
        });
    }
});

// GET /api/models/:useCase - Return models for specific use case
router.get('/models/:useCase', (req, res) => {
    try {
        const { useCase } = req.params;
        const modelsForUseCase = modelConfigurations.models.filter(
            model => model.useCase === useCase
        );
        
        if (modelsForUseCase.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No models found for use case: ${useCase}`,
                code: 'USE_CASE_NOT_FOUND'
            });
        }
        
        res.json({
            success: true,
            models: modelsForUseCase,
            useCase: useCase,
            description: modelConfigurations.useCases[useCase] || 'No description available',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Model use case endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch model configurations for use case',
            code: 'MODELS_ERROR'
        });
    }
});

module.exports = router; 
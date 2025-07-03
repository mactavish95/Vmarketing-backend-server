const express = require('express');
const router = express.Router();

// Import the selectModel function from server.js
function selectModel(useCase) {
  const LLM_MODELS = {
    reviewGenerator: {
      name: 'meta/llama-3.1-70b-instruct',
      baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
      temperature: 0.9,
      maxTokens: 1000,
      strengths: ['creative_writing', 'engagement', 'authenticity'],
      description: 'Optimized for creative, engaging review generation'
    },
    customerService: {
      name: 'meta/llama-3.1-70b-instruct',
      baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
      temperature: 0.7,
      maxTokens: 800,
      strengths: ['empathy', 'professional', 'problem_solving'],
      description: 'Optimized for empathetic customer service responses'
    },
    voiceAnalysis: {
      name: 'meta/llama-3.1-70b-instruct',
      baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
      temperature: 0.3,
      maxTokens: 2048,
      strengths: ['analysis', 'detail', 'accuracy'],
      description: 'Optimized for detailed voice analysis'
    },
    blogGenerator: {
      name: 'meta/llama-3.1-70b-instruct',
      baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
      temperature: 0.7,
      maxTokens: 1500,
      strengths: ['content_creation', 'seo_optimization', 'brand_voice', 'engagement'],
      description: 'Optimized for creating engaging, SEO-friendly blog content'
    }
  };

  switch (useCase) {
    case 'review_generation':
      return LLM_MODELS.reviewGenerator;
    case 'customer_service':
      return LLM_MODELS.customerService;
    case 'voice_analysis':
      return LLM_MODELS.voiceAnalysis;
    case 'blog_generation':
      return LLM_MODELS.blogGenerator;
    default:
      return LLM_MODELS.reviewGenerator;
  }
}

// Blog post generation endpoint
router.post('/blog/generate', async (req, res) => {
  try {
    const {
      topic,
      restaurantName,
      restaurantType,
      cuisine,
      location,
      targetAudience,
      tone,
      length,
      keyPoints,
      specialFeatures,
      apiKey
    } = req.body;

    // Validate required fields
    if (!topic || !restaurantName || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: topic, restaurantName, and apiKey are required'
      });
    }

    // Select appropriate model for blog generation
    const model = selectModel('blog_generation');
    
    // Determine word count based on length preference
    let targetWordCount;
    switch (length) {
      case 'short':
        targetWordCount = '300-500';
        break;
      case 'long':
        targetWordCount = '900-1200';
        break;
      default:
        targetWordCount = '600-800';
    }

    // Create comprehensive prompt for blog generation
    const prompt = `Create a professional blog post for a restaurant business with the following specifications:

RESTAURANT DETAILS:
- Name: ${restaurantName}
- Type: ${restaurantType}
- Cuisine: ${cuisine || 'Various'}
- Location: ${location || 'Not specified'}

BLOG SPECIFICATIONS:
- Topic: ${topic}
- Target Audience: ${targetAudience}
- Writing Tone: ${tone}
- Target Length: ${targetWordCount} words

ADDITIONAL INFORMATION:
${keyPoints ? `- Key Points to Include: ${keyPoints}` : ''}
${specialFeatures ? `- Special Features: ${specialFeatures}` : ''}

INSTRUCTIONS:
Write an engaging, SEO-friendly blog post that:
1. Captures the reader's attention with a compelling headline
2. Provides valuable content relevant to the target audience
3. Maintains the specified tone throughout
4. Includes natural mentions of the restaurant and its offerings
5. Uses proper paragraph structure and formatting
6. Ends with a call-to-action encouraging readers to visit
7. Incorporates the key points and special features naturally
8. Uses conversational language that feels authentic and engaging

The blog post should be well-structured with:
- An engaging introduction
- 2-3 main content sections
- A compelling conclusion
- Natural integration of restaurant branding

Please generate the complete blog post content only, without any additional formatting or explanations.`;

    // Generate blog post using the selected model
    try {
      const axios = require('axios');
      
      const response = await axios.post(model.baseURL, {
        model: model.name,
        messages: [
          {
            role: 'system',
            content: `You are a professional content writer specializing in restaurant blog creation. Create engaging, SEO-friendly blog posts that help restaurants connect with their audience.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: model.temperature,
        max_tokens: model.maxTokens,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const blogContent = response.data.choices[0].message.content;
      
      res.json({
        success: true,
        blogPost: blogContent,
        wordCount: blogContent.split(/\s+/).length,
        model: model.name
      });
    } catch (apiError) {
      console.error('API Error:', apiError.response?.data || apiError.message);
      res.status(500).json({
        success: false,
        error: 'Failed to generate blog post. Please check your API key and try again.'
      });
    }

  } catch (error) {
    console.error('Blog generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during blog generation'
    });
  }
});

// Get blog generation model info
router.get('/blog/model', (req, res) => {
  try {
    const model = selectModel('blog_generation');
    res.json({
      success: true,
      model: {
        name: model.name,
        description: model.description,
        useCase: 'blog_generation',
        strengths: model.strengths || ['Content Creation', 'SEO Optimization', 'Brand Voice', 'Engagement']
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get blog model information'
    });
  }
});

module.exports = router; 
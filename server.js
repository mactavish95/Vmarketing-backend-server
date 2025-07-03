const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection (optional for development)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/reviewgen';

// Try to connect to MongoDB, but don't fail if it's not available
mongoose.connect(MONGO_URI).then(() => {
  console.log('✅ Connected to MongoDB');
}).catch((err) => {
  console.warn('⚠️  MongoDB connection failed, running without database');
  console.warn('   To enable database features, start MongoDB with: sudo service mongodb start');
});

mongoose.connection.on('error', (err) => {
  console.warn('⚠️  MongoDB connection error:', err.message);
});

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

// LLM Model Configuration
const LLM_MODELS = {
  // Review Generator - Creative and engaging
  reviewGenerator: {
    name: 'meta/llama-3.1-70b-instruct',
    baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
    temperature: 0.9,
    maxTokens: 1000,
    strengths: ['creative_writing', 'engagement', 'authenticity'],
    description: 'Optimized for creative, engaging review generation'
  },
  // Customer Service - Empathetic and professional
  customerService: {
    name: 'meta/llama-3.1-70b-instruct',
    baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
    temperature: 0.7,
    maxTokens: 800,
    strengths: ['empathy', 'professional', 'problem_solving'],
    description: 'Optimized for empathetic customer service responses'
  },
  // Voice Analysis - Analytical and detailed
  voiceAnalysis: {
    name: 'meta/llama-3.1-70b-instruct',
    baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
    temperature: 0.3,
    maxTokens: 2048,
    strengths: ['analysis', 'detail', 'accuracy'],
    description: 'Optimized for detailed voice analysis'
  },
  // Blog Generation - Creative and SEO-friendly
  blogGenerator: {
    name: 'meta/llama-3.1-70b-instruct',
    baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
    temperature: 0.7,
    maxTokens: 1500,
    strengths: ['content_creation', 'seo_optimization', 'brand_voice', 'engagement'],
    description: 'Optimized for creating engaging, SEO-friendly blog content'
  }
};

// Model selection function
function selectModel(useCase) {
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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    apiKeyConfigured: !!process.env.NVIDIA_API_KEY,
    apiKeyLength: process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.length : 0
  });
});

// Enhanced function to clean and format AI responses for longer, more relevant content
function cleanAIResponse(response) {
    if (!response || typeof response !== 'string') {
        return response;
    }
    
    // Remove common AI response artifacts
    let cleaned = response
        // Remove markdown code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove asterisks used for emphasis
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        // Remove backticks
        .replace(/`(.*?)`/g, '$1')
        // Remove excessive newlines (more than 2 consecutive)
        .replace(/\n{3,}/g, '\n\n')
        // Remove leading/trailing whitespace
        .trim()
        // Remove common AI prefixes
        .replace(/^(Here's|Here is|I'll|I will|Let me|Based on|According to|As an AI|As a customer service representative|As a helpful assistant)[,\s]*/gi, '')
        // Remove common AI suffixes
        .replace(/(I hope this helps|Let me know if you need anything else|Feel free to ask|Is there anything else I can help you with)[.!]*$/gi, '')
        // Remove excessive punctuation
        .replace(/[!]{2,}/g, '!')
        .replace(/[?]{2,}/g, '?')
        .replace(/[.]{2,}/g, '.')
        // Remove emoji clusters (keep single emojis)
        .replace(/([^\s])\1{2,}/g, '$1')
        // Remove excessive spaces
        .replace(/\s{2,}/g, ' ')
        // Remove quotes around the entire response
        .replace(/^["']|["']$/g, '')
        // Remove bullet points and numbering
        .replace(/^[\s]*[-*•]\s*/gm, '')
        .replace(/^[\s]*\d+[.)]\s*/gm, '')
        // Remove section headers
        .replace(/^[A-Z][A-Z\s]+:$/gm, '')
        // Remove empty lines at start and end
        .replace(/^\s*\n/, '')
        .replace(/\n\s*$/, '');
    
    // Apply enhanced formatting for longer, more comprehensive, and topic-relevant responses
    cleaned = formatForEnhancedDepthAndRelevance(cleaned);
    
    return cleaned;
}

// Enhanced formatting function for longer, more comprehensive, and topic-relevant responses
function formatForEnhancedDepthAndRelevance(text) {
    if (!text || typeof text !== 'string') {
        return text;
    }
    
    // Split into sentences and clean them
    const sentences = text.split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    // Enhanced content structure analysis
    const structure = analyzeEnhancedContentStructure(sentences);
    
    // Format based on content type with enhanced depth
    if (structure.type === 'review') {
        return formatEnhancedReviewResponse(sentences, structure);
    } else if (structure.type === 'analysis') {
        return formatEnhancedAnalysisResponse(sentences, structure);
    } else if (structure.type === 'conversation') {
        return formatEnhancedConversationResponse(sentences, structure);
    } else if (structure.type === 'customer_service') {
        return formatEnhancedCustomerServiceResponse(sentences, structure);
    } else {
        return formatEnhancedGeneralResponse(sentences, structure);
    }
}

// Analyze the structure of the content
function analyzeContentStructure(sentences) {
    const text = sentences.join(' ').toLowerCase();
    
    // Detect content type
    let type = 'general';
    if (text.includes('rating') || text.includes('stars') || text.includes('recommend') || text.includes('experience')) {
        type = 'review';
    } else if (text.includes('analysis') || text.includes('sentiment') || text.includes('key points') || text.includes('summary')) {
        type = 'analysis';
    } else if (text.includes('hello') || text.includes('hi') || text.includes('how are you') || text.includes('chat')) {
        type = 'conversation';
    }
    
    // Extract key elements
    const keyPoints = sentences.filter(s => 
        s.toLowerCase().includes('important') || 
        s.toLowerCase().includes('key') || 
        s.toLowerCase().includes('main') ||
        s.toLowerCase().includes('primary')
    );
    
    const questions = sentences.filter(s => s.includes('?'));
    const statements = sentences.filter(s => !s.includes('?'));
    
    return {
        type,
        keyPoints,
        questions,
        statements,
        totalSentences: sentences.length
    };
}

// Enhanced content structure analysis for better topic relevance
function analyzeEnhancedContentStructure(sentences) {
    const text = sentences.join(' ').toLowerCase();
    
    // Enhanced content type detection
    let type = 'general';
    if (text.includes('rating') || text.includes('stars') || text.includes('recommend') || text.includes('experience') || text.includes('food') || text.includes('service') || text.includes('quality')) {
        type = 'review';
    } else if (text.includes('analysis') || text.includes('sentiment') || text.includes('key points') || text.includes('summary') || text.includes('findings') || text.includes('insights')) {
        type = 'analysis';
    } else if (text.includes('hello') || text.includes('hi') || text.includes('how are you') || text.includes('chat') || text.includes('conversation')) {
        type = 'conversation';
    } else if (text.includes('customer') || text.includes('service') || text.includes('apologize') || text.includes('resolve') || text.includes('issue') || text.includes('problem')) {
        type = 'customer_service';
    }
    
    // Enhanced key elements extraction
    const keyPoints = sentences.filter(s => 
        s.toLowerCase().includes('important') || 
        s.toLowerCase().includes('key') || 
        s.toLowerCase().includes('main') ||
        s.toLowerCase().includes('primary') ||
        s.toLowerCase().includes('essential') ||
        s.toLowerCase().includes('critical')
    );
    
    const positiveAspects = sentences.filter(s => 
        s.toLowerCase().includes('like') || 
        s.toLowerCase().includes('love') || 
        s.toLowerCase().includes('good') ||
        s.toLowerCase().includes('great') ||
        s.toLowerCase().includes('amazing') ||
        s.toLowerCase().includes('excellent') ||
        s.toLowerCase().includes('outstanding') ||
        s.toLowerCase().includes('fantastic')
    );
    
    const negativeAspects = sentences.filter(s => 
        s.toLowerCase().includes('disappointing') ||
        s.toLowerCase().includes('bad') ||
        s.toLowerCase().includes('poor') ||
        s.toLowerCase().includes('terrible') ||
        s.toLowerCase().includes('awful') ||
        s.toLowerCase().includes('horrible') ||
        s.toLowerCase().includes('unacceptable')
    );
    
    const suggestions = sentences.filter(s => 
        s.toLowerCase().includes('suggest') || 
        s.toLowerCase().includes('recommend') || 
        s.toLowerCase().includes('could') ||
        s.toLowerCase().includes('should') ||
        s.toLowerCase().includes('might') ||
        s.toLowerCase().includes('consider')
    );
    
    const questions = sentences.filter(s => s.includes('?'));
    const statements = sentences.filter(s => !s.includes('?'));
    
    // Extract topic-specific keywords
    const topics = extractTopicKeywords(text);
    
    return {
        type,
        keyPoints,
        positiveAspects,
        negativeAspects,
        suggestions,
        questions,
        statements,
        topics,
        totalSentences: sentences.length
    };
}

// Extract topic-specific keywords for better relevance
function extractTopicKeywords(text) {
    const topics = [];
    
    // Restaurant-related topics
    if (text.includes('food') || text.includes('restaurant') || text.includes('dining') || text.includes('meal')) {
        topics.push('restaurant', 'food', 'dining');
    }
    
    // Hotel-related topics
    if (text.includes('hotel') || text.includes('accommodation') || text.includes('room') || text.includes('stay')) {
        topics.push('hotel', 'accommodation', 'travel');
    }
    
    // Product-related topics
    if (text.includes('product') || text.includes('item') || text.includes('purchase') || text.includes('buy')) {
        topics.push('product', 'shopping', 'consumer');
    }
    
    // Service-related topics
    if (text.includes('service') || text.includes('support') || text.includes('help') || text.includes('assistance')) {
        topics.push('service', 'support', 'customer care');
    }
    
    // Technology-related topics
    if (text.includes('app') || text.includes('software') || text.includes('technology') || text.includes('digital')) {
        topics.push('technology', 'software', 'digital');
    }
    
    return [...new Set(topics)]; // Remove duplicates
}

// Format review responses with clear structure
function formatReviewResponse(sentences, structure) {
    let formatted = '';
    
    // Opening statement
    const opening = sentences.find(s => 
        s.toLowerCase().includes('experience') || 
        s.toLowerCase().includes('visit') || 
        s.toLowerCase().includes('tried') ||
        s.toLowerCase().includes('went')
    );
    
    if (opening) {
        formatted += `📝 ${capitalizeFirst(opening)}.\n\n`;
    }
    
    // Main points
    const mainPoints = sentences.filter(s => 
        s.toLowerCase().includes('like') || 
        s.toLowerCase().includes('love') || 
        s.toLowerCase().includes('good') ||
        s.toLowerCase().includes('great') ||
        s.toLowerCase().includes('amazing') ||
        s.toLowerCase().includes('disappointing') ||
        s.toLowerCase().includes('bad') ||
        s.toLowerCase().includes('poor')
    );
    
    if (mainPoints.length > 0) {
        formatted += '✨ Key Highlights:\n';
        mainPoints.slice(0, 3).forEach((point, index) => {
            formatted += `   • ${capitalizeFirst(point)}.\n`;
        });
        formatted += '\n';
    }
    
    // Additional details
    const details = sentences.filter(s => 
        !mainPoints.includes(s) && 
        !opening?.includes(s) &&
        s.length > 20
    );
    
    if (details.length > 0) {
        formatted += '📋 Additional Details:\n';
        details.slice(0, 2).forEach(detail => {
            formatted += `   ${capitalizeFirst(detail)}.\n`;
        });
        formatted += '\n';
    }
    
    // Conclusion
    const conclusion = sentences.find(s => 
        s.toLowerCase().includes('recommend') || 
        s.toLowerCase().includes('return') || 
        s.toLowerCase().includes('worth') ||
        s.toLowerCase().includes('overall')
    );
    
    if (conclusion) {
        formatted += `🎯 ${capitalizeFirst(conclusion)}.`;
    }
    
    return formatted.trim();
}

// Format analysis responses with structured sections
function formatAnalysisResponse(sentences, structure) {
    let formatted = '';
    
    // Summary section
    const summary = sentences.find(s => 
        s.toLowerCase().includes('overall') || 
        s.toLowerCase().includes('summary') || 
        s.toLowerCase().includes('in conclusion')
    );
    
    if (summary) {
        formatted += `📊 Summary:\n${capitalizeFirst(summary)}.\n\n`;
    }
    
    // Key findings
    const findings = sentences.filter(s => 
        s.toLowerCase().includes('found') || 
        s.toLowerCase().includes('discovered') || 
        s.toLowerCase().includes('identified') ||
        s.toLowerCase().includes('detected')
    );
    
    if (findings.length > 0) {
        formatted += '🔍 Key Findings:\n';
        findings.slice(0, 3).forEach((finding, index) => {
            formatted += `   ${index + 1}. ${capitalizeFirst(finding)}.\n`;
        });
        formatted += '\n';
    }
    
    // Recommendations
    const recommendations = sentences.filter(s => 
        s.toLowerCase().includes('recommend') || 
        s.toLowerCase().includes('suggest') || 
        s.toLowerCase().includes('should') ||
        s.toLowerCase().includes('could')
    );
    
    if (recommendations.length > 0) {
        formatted += '💡 Recommendations:\n';
        recommendations.slice(0, 3).forEach((rec, index) => {
            formatted += `   • ${capitalizeFirst(rec)}.\n`;
        });
        formatted += '\n';
    }
    
    // Next steps
    const nextSteps = sentences.filter(s => 
        s.toLowerCase().includes('next') || 
        s.toLowerCase().includes('action') || 
        s.toLowerCase().includes('step') ||
        s.toLowerCase().includes('plan')
    );
    
    if (nextSteps.length > 0) {
        formatted += '🚀 Next Steps:\n';
        nextSteps.slice(0, 2).forEach((step, index) => {
            formatted += `   ${index + 1}. ${capitalizeFirst(step)}.\n`;
        });
    }
    
    return formatted.trim();
}

// Format conversation responses naturally
function formatConversationResponse(sentences, structure) {
    let formatted = '';
    
    // Greeting or acknowledgment
    const greeting = sentences.find(s => 
        s.toLowerCase().includes('hello') || 
        s.toLowerCase().includes('hi') || 
        s.toLowerCase().includes('hey') ||
        s.toLowerCase().includes('thanks') ||
        s.toLowerCase().includes('thank you')
    );
    
    if (greeting) {
        formatted += `${capitalizeFirst(greeting)}.\n\n`;
    }
    
    // Main response
    const mainResponse = sentences.filter(s => 
        !greeting?.includes(s) &&
        s.length > 10
    );
    
    if (mainResponse.length > 0) {
        formatted += mainResponse.slice(0, 3).map(s => capitalizeFirst(s)).join(' ');
        formatted += '\n\n';
    }
    
    // Follow-up or engagement
    const followUp = sentences.find(s => 
        s.toLowerCase().includes('what about you') || 
        s.toLowerCase().includes('how about') || 
        s.toLowerCase().includes('what do you think') ||
        s.toLowerCase().includes('any thoughts')
    );
    
    if (followUp) {
        formatted += `💭 ${capitalizeFirst(followUp)}`;
    }
    
    return formatted.trim();
}

// Format general responses with clear structure
function formatGeneralResponse(sentences, structure) {
    let formatted = '';
    
    // Main point
    const mainPoint = sentences[0];
    if (mainPoint) {
        formatted += `📌 ${capitalizeFirst(mainPoint)}.\n\n`;
    }
    
    // Supporting points
    const supportingPoints = sentences.slice(1, 4);
    if (supportingPoints.length > 0) {
        formatted += '📋 Details:\n';
        supportingPoints.forEach((point, index) => {
            formatted += `   ${index + 1}. ${capitalizeFirst(point)}.\n`;
        });
        formatted += '\n';
    }
    
    // Conclusion or takeaway
    const conclusion = sentences.find(s => 
        s.toLowerCase().includes('therefore') || 
        s.toLowerCase().includes('thus') || 
        s.toLowerCase().includes('in summary') ||
        s.toLowerCase().includes('overall')
    );
    
    if (conclusion) {
        formatted += `🎯 ${capitalizeFirst(conclusion)}`;
    }
    
    return formatted.trim();
}

// Helper function to capitalize first letter
function capitalizeFirst(str) {
    if (!str || typeof str !== 'string') return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Enhanced review response with comprehensive details
function formatEnhancedReviewResponse(sentences, structure) {
    let formatted = '';
    
    // Comprehensive opening with context
    const opening = sentences.find(s => 
        s.toLowerCase().includes('experience') || 
        s.toLowerCase().includes('visit') || 
        s.toLowerCase().includes('tried') ||
        s.toLowerCase().includes('went') ||
        s.toLowerCase().includes('recently') ||
        s.toLowerCase().includes('last')
    );
    
    if (opening) {
        formatted += `📝 ${capitalizeFirst(opening)}.\n\n`;
    }
    
    // Detailed positive aspects section
    if (structure.positiveAspects.length > 0) {
        formatted += '✨ What I Really Enjoyed:\n';
        structure.positiveAspects.slice(0, 4).forEach((aspect, index) => {
            formatted += `   • ${capitalizeFirst(aspect)}.\n`;
        });
        formatted += '\n';
    }
    
    // Detailed negative aspects section
    if (structure.negativeAspects.length > 0) {
        formatted += '⚠️ Areas for Improvement:\n';
        structure.negativeAspects.slice(0, 3).forEach((aspect, index) => {
            formatted += `   • ${capitalizeFirst(aspect)}.\n`;
        });
        formatted += '\n';
    }
    
    // Key highlights and memorable moments
    const highlights = sentences.filter(s => 
        s.toLowerCase().includes('highlight') || 
        s.toLowerCase().includes('memorable') || 
        s.toLowerCase().includes('standout') ||
        s.toLowerCase().includes('impressive') ||
        s.toLowerCase().includes('notable')
    );
    
    if (highlights.length > 0) {
        formatted += '🌟 Memorable Highlights:\n';
        highlights.slice(0, 3).forEach((highlight, index) => {
            formatted += `   ${index + 1}. ${capitalizeFirst(highlight)}.\n`;
        });
        formatted += '\n';
    }
    
    // Detailed experience description
    const experienceDetails = sentences.filter(s => 
        s.toLowerCase().includes('atmosphere') || 
        s.toLowerCase().includes('ambiance') || 
        s.toLowerCase().includes('environment') ||
        s.toLowerCase().includes('setting') ||
        s.toLowerCase().includes('vibe') ||
        s.toLowerCase().includes('feel')
    );
    
    if (experienceDetails.length > 0) {
        formatted += '🏠 Atmosphere & Environment:\n';
        experienceDetails.slice(0, 2).forEach(detail => {
            formatted += `   ${capitalizeFirst(detail)}.\n`;
        });
        formatted += '\n';
    }
    
    // Value and pricing considerations
    const valueAspects = sentences.filter(s => 
        s.toLowerCase().includes('price') || 
        s.toLowerCase().includes('cost') || 
        s.toLowerCase().includes('value') ||
        s.toLowerCase().includes('worth') ||
        s.toLowerCase().includes('expensive') ||
        s.toLowerCase().includes('affordable')
    );
    
    if (valueAspects.length > 0) {
        formatted += '💰 Value & Pricing:\n';
        valueAspects.slice(0, 2).forEach(aspect => {
            formatted += `   ${capitalizeFirst(aspect)}.\n`;
        });
        formatted += '\n';
    }
    
    // Recommendations and suggestions
    if (structure.suggestions.length > 0) {
        formatted += '💡 Recommendations:\n';
        structure.suggestions.slice(0, 3).forEach((suggestion, index) => {
            formatted += `   • ${capitalizeFirst(suggestion)}.\n`;
        });
        formatted += '\n';
    }
    
    // Comprehensive conclusion
    const conclusion = sentences.find(s => 
        s.toLowerCase().includes('recommend') || 
        s.toLowerCase().includes('return') || 
        s.toLowerCase().includes('worth') ||
        s.toLowerCase().includes('overall') ||
        s.toLowerCase().includes('conclusion') ||
        s.toLowerCase().includes('final')
    );
    
    if (conclusion) {
        formatted += `🎯 ${capitalizeFirst(conclusion)}.`;
    } else {
        // Generate a comprehensive conclusion based on sentiment
        const positiveCount = structure.positiveAspects.length;
        const negativeCount = structure.negativeAspects.length;
        
        if (positiveCount > negativeCount) {
            formatted += `🎯 Overall, this was a positive experience that I would recommend to others.`;
        } else if (negativeCount > positiveCount) {
            formatted += `🎯 While there were some issues, there's potential for improvement with the right changes.`;
        } else {
            formatted += `🎯 This was a mixed experience with both positive and negative aspects to consider.`;
        }
    }
    
    return formatted.trim();
}

// Enhanced analysis response with detailed insights
function formatEnhancedAnalysisResponse(sentences, structure) {
    let formatted = '';
    
    // Executive summary
    const summary = sentences.find(s => 
        s.toLowerCase().includes('overall') || 
        s.toLowerCase().includes('summary') || 
        s.toLowerCase().includes('in conclusion') ||
        s.toLowerCase().includes('main takeaway')
    );
    
    if (summary) {
        formatted += `📊 Executive Summary:\n${capitalizeFirst(summary)}.\n\n`;
    }
    
    // Detailed key findings with context
    const findings = sentences.filter(s => 
        s.toLowerCase().includes('found') || 
        s.toLowerCase().includes('discovered') || 
        s.toLowerCase().includes('identified') ||
        s.toLowerCase().includes('detected') ||
        s.toLowerCase().includes('observed') ||
        s.toLowerCase().includes('noticed')
    );
    
    if (findings.length > 0) {
        formatted += '🔍 Detailed Findings:\n';
        findings.slice(0, 5).forEach((finding, index) => {
            formatted += `   ${index + 1}. ${capitalizeFirst(finding)}.\n`;
        });
        formatted += '\n';
    }
    
    // Sentiment analysis breakdown
    const sentimentSentences = sentences.filter(s => 
        s.toLowerCase().includes('positive') || 
        s.toLowerCase().includes('negative') || 
        s.toLowerCase().includes('neutral') ||
        s.toLowerCase().includes('sentiment') ||
        s.toLowerCase().includes('emotion') ||
        s.toLowerCase().includes('tone')
    );
    
    if (sentimentSentences.length > 0) {
        formatted += '😊 Sentiment Analysis:\n';
        sentimentSentences.slice(0, 3).forEach((sentiment, index) => {
            formatted += `   • ${capitalizeFirst(sentiment)}.\n`;
        });
        formatted += '\n';
    }
    
    // Topic-specific insights
    if (structure.topics.length > 0) {
        formatted += `📋 ${structure.topics[0].charAt(0).toUpperCase() + structure.topics[0].slice(1)}-Specific Insights:\n`;
        const topicSentences = sentences.filter(s => 
            structure.topics.some(topic => s.toLowerCase().includes(topic))
        );
        topicSentences.slice(0, 3).forEach((insight, index) => {
            formatted += `   ${index + 1}. ${capitalizeFirst(insight)}.\n`;
        });
        formatted += '\n';
    }
    
    // Strategic recommendations
    if (structure.suggestions.length > 0) {
        formatted += '💡 Strategic Recommendations:\n';
        structure.suggestions.slice(0, 4).forEach((rec, index) => {
            formatted += `   • ${capitalizeFirst(rec)}.\n`;
        });
        formatted += '\n';
    }
    
    // Action items and next steps
    const actionItems = sentences.filter(s => 
        s.toLowerCase().includes('action') || 
        s.toLowerCase().includes('next') || 
        s.toLowerCase().includes('step') ||
        s.toLowerCase().includes('plan') ||
        s.toLowerCase().includes('implement') ||
        s.toLowerCase().includes('improve')
    );
    
    if (actionItems.length > 0) {
        formatted += '🚀 Action Items & Next Steps:\n';
        actionItems.slice(0, 4).forEach((item, index) => {
            formatted += `   ${index + 1}. ${capitalizeFirst(item)}.\n`;
        });
        formatted += '\n';
    }
    
    // Impact assessment
    const impactSentences = sentences.filter(s => 
        s.toLowerCase().includes('impact') || 
        s.toLowerCase().includes('effect') || 
        s.toLowerCase().includes('result') ||
        s.toLowerCase().includes('outcome') ||
        s.toLowerCase().includes('consequence')
    );
    
    if (impactSentences.length > 0) {
        formatted += '📈 Impact Assessment:\n';
        impactSentences.slice(0, 2).forEach((impact, index) => {
            formatted += `   • ${capitalizeFirst(impact)}.\n`;
        });
    }
    
    return formatted.trim();
}

// Enhanced conversation response with better structure and flow
function formatEnhancedConversationResponse(sentences, structure) {
    let formatted = '';
    
    // Analyze conversation context and structure
    const context = analyzeConversationContext(sentences);
    
    // Warm contextual opening
    if (context.hasGreeting) {
        const greeting = sentences.find(s => 
            s.toLowerCase().includes('hello') || 
            s.toLowerCase().includes('hi') || 
            s.toLowerCase().includes('hey') ||
            s.toLowerCase().includes('thanks') ||
            s.toLowerCase().includes('thank you') ||
            s.toLowerCase().includes('appreciate')
        );
        formatted += `${capitalizeFirst(greeting)}.\n\n`;
    }
    
    // Main conversational response with natural flow
    const mainResponse = sentences.filter(s => 
        !context.hasGreeting?.includes(s) &&
        s.length > 10
    );
    
    if (mainResponse.length > 0) {
        // Structure main response with natural flow
        const structuredResponse = structureMainResponse(mainResponse, context);
        formatted += structuredResponse;
        formatted += '\n\n';
    }
    
    // Add contextual insights when relevant
    if (context.hasPersonalInsights) {
        const insights = sentences.filter(s => 
            s.toLowerCase().includes('think') || 
            s.toLowerCase().includes('believe') || 
            s.toLowerCase().includes('feel') ||
            s.toLowerCase().includes('experience') ||
            s.toLowerCase().includes('opinion') ||
            s.toLowerCase().includes('view')
        );
        
        if (insights.length > 0) {
            formatted += '💭 My Perspective:\n';
            insights.slice(0, 2).forEach((insight, index) => {
                formatted += `   ${capitalizeFirst(insight)}.\n`;
            });
            formatted += '\n';
        }
    }
    
    // Engaging conversational closing
    const closing = generateConversationalClosing(context, sentences);
    formatted += closing;
    
    return formatted.trim();
}

// Analyze conversation context for better structure
function analyzeConversationContext(sentences) {
    const text = sentences.join(' ').toLowerCase();
    
    return {
        hasGreeting: text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('thanks'),
        hasQuestion: text.includes('?'),
        hasPersonalInsights: text.includes('think') || text.includes('believe') || text.includes('feel'),
        isCasual: text.includes('cool') || text.includes('awesome') || text.includes('great'),
        isThoughtful: text.includes('interesting') || text.includes('fascinating') || text.includes('consider'),
        topic: extractConversationTopic(text),
        sentiment: extractConversationSentiment(text)
    };
}

// Structure main response with natural flow
function structureMainResponse(sentences, context) {
    let structured = '';
    
    // Group sentences by logical flow
    const openingSentences = sentences.slice(0, 2);
    const mainContent = sentences.slice(2, 5);
    const closingSentences = sentences.slice(5, 7);
    
    // Natural opening
    if (openingSentences.length > 0) {
        structured += openingSentences.map(s => capitalizeFirst(s)).join(' ');
        structured += '\n\n';
    }
    
    // Main content with natural structure
    if (mainContent.length > 0) {
        if (context.hasQuestion) {
            structured += '🤔 Here\'s what I think:\n';
        } else if (context.isCasual) {
            structured += '😊 ';
        } else {
            structured += '💭 ';
        }
        
        mainContent.forEach((sentence, index) => {
            structured += `${capitalizeFirst(sentence)} `;
        });
        structured += '\n\n';
    }
    
    // Natural closing
    if (closingSentences.length > 0) {
        structured += closingSentences.map(s => capitalizeFirst(s)).join(' ');
    }
    
    return structured;
}

// Generate engaging conversational closing
function generateConversationalClosing(context, sentences) {
    const text = sentences.join(' ').toLowerCase();
    
    // Check for existing follow-up questions
    const existingFollowUp = sentences.find(s => 
        s.toLowerCase().includes('what about you') || 
        s.toLowerCase().includes('how about') || 
        s.toLowerCase().includes('what do you think') ||
        s.toLowerCase().includes('any thoughts') ||
        s.toLowerCase().includes('your experience') ||
        s.toLowerCase().includes('your opinion')
    );
    
    if (existingFollowUp) {
        return `💬 ${capitalizeFirst(existingFollowUp)}`;
    }
    
    // Generate contextual follow-up based on conversation type
    if (context.hasQuestion) {
        return `💬 What are your thoughts on this? I'd love to hear your perspective!`;
    } else if (context.isCasual) {
        return `💬 How about you? What's your take on this?`;
    } else if (context.isThoughtful) {
        return `💬 What do you think about this? I'm curious about your viewpoint.`;
    } else {
        return `💬 What are your thoughts? I'd love to continue this conversation!`;
    }
}

// Extract conversation topic for better context
function extractConversationTopic(text) {
    if (text.includes('ai') || text.includes('artificial intelligence')) return 'technology';
    if (text.includes('future') || text.includes('tomorrow')) return 'future';
    if (text.includes('story') || text.includes('joke')) return 'entertainment';
    if (text.includes('day') || text.includes('going')) return 'personal';
    if (text.includes('help') || text.includes('understand')) return 'assistance';
    return 'general';
}

// Extract conversation sentiment for tone matching
function extractConversationSentiment(text) {
    if (text.includes('amazing') || text.includes('awesome') || text.includes('great')) return 'positive';
    if (text.includes('worried') || text.includes('concerned') || text.includes('problem')) return 'concerned';
    if (text.includes('curious') || text.includes('wonder') || text.includes('think')) return 'thoughtful';
    return 'neutral';
}

// Analyze conversation flow for better context
function analyzeConversationFlow(history) {
    const context = {
        topics: new Set(),
        tone: 'neutral',
        complexity: 'simple',
        engagement: 'medium',
        continuity: []
    };
    
    history.forEach((msg, index) => {
        const text = msg.content.toLowerCase();
        
        // Track topics
        if (text.includes('ai') || text.includes('technology')) context.topics.add('technology');
        if (text.includes('future') || text.includes('tomorrow')) context.topics.add('future');
        if (text.includes('personal') || text.includes('day')) context.topics.add('personal');
        if (text.includes('help') || text.includes('question')) context.topics.add('assistance');
        
        // Analyze tone progression
        if (text.includes('!') || text.includes('amazing')) context.tone = 'enthusiastic';
        if (text.includes('?') && context.tone === 'neutral') context.tone = 'curious';
        
        // Track complexity
        if (text.split(' ').length > 20) context.complexity = 'detailed';
        
        // Track engagement
        if (text.includes('what about you') || text.includes('your thoughts')) {
            context.engagement = 'high';
        }
        
        // Track conversation continuity
        if (index > 0) {
            const prevText = history[index - 1].content.toLowerCase();
            if (hasTopicContinuity(prevText, text)) {
                context.continuity.push(true);
            } else {
                context.continuity.push(false);
            }
        }
    });
    
    return context;
}

// Check for topic continuity between messages
function hasTopicContinuity(prevText, currentText) {
    const topics = ['ai', 'technology', 'future', 'personal', 'help', 'question', 'think', 'feel'];
    return topics.some(topic => prevText.includes(topic) && currentText.includes(topic));
}

// Enhance user messages with context
function enhanceUserMessage(content, context) {
    // Add subtle context hints for better conversation flow
    let enhanced = content;
    
    if (context.topics.has('technology') && content.toLowerCase().includes('ai')) {
        enhanced = `[Continuing our AI discussion] ${content}`;
    } else if (context.engagement === 'high' && content.includes('?')) {
        enhanced = `[Following up on your question] ${content}`;
    } else if (context.continuity[context.continuity.length - 1] === false) {
        enhanced = `[New topic] ${content}`;
    }
    
    return enhanced;
}

// Enhanced customer service response with comprehensive approach
function formatEnhancedCustomerServiceResponse(sentences, structure) {
    let formatted = '';
    
    // Empathetic acknowledgment
    const acknowledgment = sentences.find(s => 
        s.toLowerCase().includes('understand') || 
        s.toLowerCase().includes('apologize') || 
        s.toLowerCase().includes('sorry') ||
        s.toLowerCase().includes('concern') ||
        s.toLowerCase().includes('issue') ||
        s.toLowerCase().includes('problem')
    );
    
    if (acknowledgment) {
        formatted += `🤝 ${capitalizeFirst(acknowledgment)}.\n\n`;
    }
    
    // Detailed problem understanding
    const problemAnalysis = sentences.filter(s => 
        s.toLowerCase().includes('situation') || 
        s.toLowerCase().includes('circumstance') || 
        s.toLowerCase().includes('experience') ||
        s.toLowerCase().includes('issue') ||
        s.toLowerCase().includes('problem') ||
        s.toLowerCase().includes('concern')
    );
    
    if (problemAnalysis.length > 0) {
        formatted += '📋 Understanding Your Situation:\n';
        problemAnalysis.slice(0, 3).forEach((analysis, index) => {
            formatted += `   • ${capitalizeFirst(analysis)}.\n`;
        });
        formatted += '\n';
    }
    
    // Immediate solutions and actions
    const solutions = sentences.filter(s => 
        s.toLowerCase().includes('solution') || 
        s.toLowerCase().includes('resolve') || 
        s.toLowerCase().includes('fix') ||
        s.toLowerCase().includes('address') ||
        s.toLowerCase().includes('correct') ||
        s.toLowerCase().includes('improve')
    );
    
    if (solutions.length > 0) {
        formatted += '🔧 Immediate Solutions:\n';
        solutions.slice(0, 4).forEach((solution, index) => {
            formatted += `   ${index + 1}. ${capitalizeFirst(solution)}.\n`;
        });
        formatted += '\n';
    }
    
    // Long-term improvements
    const improvements = sentences.filter(s => 
        s.toLowerCase().includes('improve') || 
        s.toLowerCase().includes('enhance') || 
        s.toLowerCase().includes('better') ||
        s.toLowerCase().includes('upgrade') ||
        s.toLowerCase().includes('develop') ||
        s.toLowerCase().includes('advance')
    );
    
    if (improvements.length > 0) {
        formatted += '🚀 Long-term Improvements:\n';
        improvements.slice(0, 3).forEach((improvement, index) => {
            formatted += `   • ${capitalizeFirst(improvement)}.\n`;
        });
        formatted += '\n';
    }
    
    // Compensation or goodwill gestures
    const compensation = sentences.filter(s => 
        s.toLowerCase().includes('compensate') || 
        s.toLowerCase().includes('refund') || 
        s.toLowerCase().includes('discount') ||
        s.toLowerCase().includes('credit') ||
        s.toLowerCase().includes('offer') ||
        s.toLowerCase().includes('gesture')
    );
    
    if (compensation.length > 0) {
        formatted += '🎁 Goodwill Gestures:\n';
        compensation.slice(0, 2).forEach((gesture, index) => {
            formatted += `   • ${capitalizeFirst(gesture)}.\n`;
        });
        formatted += '\n';
    }
    
    // Follow-up and contact information
    const followUp = sentences.find(s => 
        s.toLowerCase().includes('contact') || 
        s.toLowerCase().includes('reach') || 
        s.toLowerCase().includes('follow up') ||
        s.toLowerCase().includes('get in touch') ||
        s.toLowerCase().includes('available')
    );
    
    if (followUp) {
        formatted += `📞 ${capitalizeFirst(followUp)}`;
    } else {
        formatted += `📞 Please don't hesitate to reach out if you need any further assistance.`;
    }
    
    return formatted.trim();
}

// Enhanced general response with comprehensive structure
function formatEnhancedGeneralResponse(sentences, structure) {
    let formatted = '';
    
    // Main point with context
    const mainPoint = sentences[0];
    if (mainPoint) {
        formatted += `📌 Main Point:\n${capitalizeFirst(mainPoint)}.\n\n`;
    }
    
    // Detailed explanation
    const explanations = sentences.slice(1, 6);
    if (explanations.length > 0) {
        formatted += '📋 Detailed Explanation:\n';
        explanations.forEach((explanation, index) => {
            formatted += `   ${index + 1}. ${capitalizeFirst(explanation)}.\n`;
        });
        formatted += '\n';
    }
    
    // Key insights and takeaways
    const insights = sentences.filter(s => 
        s.toLowerCase().includes('important') || 
        s.toLowerCase().includes('key') || 
        s.toLowerCase().includes('essential') ||
        s.toLowerCase().includes('critical') ||
        s.toLowerCase().includes('significant') ||
        s.toLowerCase().includes('notable')
    );
    
    if (insights.length > 0) {
        formatted += '💡 Key Insights:\n';
        insights.slice(0, 3).forEach((insight, index) => {
            formatted += `   • ${capitalizeFirst(insight)}.\n`;
        });
        formatted += '\n';
    }
    
    // Practical applications or examples
    const applications = sentences.filter(s => 
        s.toLowerCase().includes('example') || 
        s.toLowerCase().includes('instance') || 
        s.toLowerCase().includes('case') ||
        s.toLowerCase().includes('scenario') ||
        s.toLowerCase().includes('situation') ||
        s.toLowerCase().includes('application')
    );
    
    if (applications.length > 0) {
        formatted += '🔍 Practical Examples:\n';
        applications.slice(0, 2).forEach((app, index) => {
            formatted += `   ${index + 1}. ${capitalizeFirst(app)}.\n`;
        });
        formatted += '\n';
    }
    
    // Comprehensive conclusion
    const conclusion = sentences.find(s => 
        s.toLowerCase().includes('therefore') || 
        s.toLowerCase().includes('thus') || 
        s.toLowerCase().includes('in summary') ||
        s.toLowerCase().includes('overall') ||
        s.toLowerCase().includes('conclusion') ||
        s.toLowerCase().includes('final')
    );
    
    if (conclusion) {
        formatted += `🎯 ${capitalizeFirst(conclusion)}`;
    } else {
        // Generate a comprehensive conclusion
        formatted += `🎯 In summary, this topic encompasses multiple important aspects that deserve careful consideration and thoughtful discussion.`;
    }
    
    return formatted.trim();
}

// NVIDIA Llama API endpoint
app.post('/api/llama', async (req, res) => {
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

    // Build conversation context with enhanced thinking and structured formatting
    const messages = [
      {
        role: "system",
        content: `You are a thoughtful, intelligent AI assistant with deep reasoning capabilities and excellent conversational skills. 

**CONVERSATION STRUCTURE APPROACH**:
1. **CONTEXT ANALYSIS**: Understand the conversation flow, user's intent, and emotional state
2. **THOUGHTFUL PROCESSING**: Consider the broader context and implications of the query
3. **STRUCTURED RESPONSE**: Organize your thoughts in a clear, logical flow
4. **ENGAGING DELIVERY**: Make responses conversational, natural, and engaging
5. **FOLLOW-UP AWARENESS**: Consider how your response might lead to further conversation

**RESPONSE FORMATTING GUIDELINES**:
- Start with a warm, contextual acknowledgment when appropriate
- Present main points in a logical, easy-to-follow structure
- Use natural transitions between ideas
- Include relevant examples or analogies when helpful
- End with an engaging element that encourages continued conversation
- Maintain a consistent, friendly personality throughout

**CONVERSATION CONTEXT HANDLING**:
- Reference previous parts of the conversation when relevant
- Build upon established topics and themes
- Show understanding of the user's perspective and interests
- Adapt your tone and style to match the conversation flow
- Provide thoughtful, well-reasoned responses that add genuine value

Your responses should feel natural, engaging, and genuinely helpful while maintaining excellent conversational flow.`
      }
    ];

    // Add conversation history with enhanced context
    if (conversationHistory && conversationHistory.length > 0) {
      // Add recent conversation history (last 8 messages for better context)
      const recentHistory = conversationHistory.slice(-8);
      
      // Analyze conversation flow for better context
      const conversationContext = analyzeConversationFlow(recentHistory);
      
      // Add context-aware conversation history
      recentHistory.forEach((msg, index) => {
        // Enhance user messages with context when helpful
        if (msg.role === 'user' && index > 0) {
          const enhancedContent = enhanceUserMessage(msg.content, conversationContext);
          messages.push({
            role: msg.role,
            content: enhancedContent
          });
        } else {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      content: sanitizedText
    });

    // Use axios to call NVIDIA API
    const completion = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: "meta/llama-3.1-70b-instruct",
        messages: messages,
        temperature: 0.6,
        top_p: 0.85,
        max_tokens: 3072,
        frequency_penalty: 0.15,
        presence_penalty: 0.15,
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const response = completion.data.choices[0]?.message?.content || 'No response generated';
    
    console.log(`Conversational response generated. Tokens used: ${completion.data.usage?.total_tokens || 'unknown'}`);

    // Clean the response
    const cleanedResponse = cleanAIResponse(response);

    res.json({
      success: true,
      response: cleanedResponse,
      usage: completion.data.usage,
      model: "meta/llama-3.1-70b-instruct",
      timestamp: new Date().toISOString()
    });

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

// Voice Analysis endpoint using NVIDIA Llama
app.post('/api/voice/analyze', async (req, res) => {
  try {
    const { transcript, apiKey } = req.body;

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

    // Select model for voice analysis
    const model = selectModel('voice_analysis');
    console.log(`🎯 Using ${model.name} for voice analysis (${model.description})`);

    // Enhanced prompt for voice analysis
    const prompt = `You are an expert voice analysis AI with deep understanding of human communication, emotions, and language patterns.

**VOICE ANALYSIS APPROACH:**
1. **DETAILED ANALYSIS**: Thoroughly analyze the transcript for meaning, emotions, and patterns
2. **ACCURATE ASSESSMENT**: Provide precise sentiment, tone, and content analysis
3. **COMPREHENSIVE INSIGHTS**: Extract key points, topics, and actionable insights
4. **STRUCTURED OUTPUT**: Organize findings in a clear, logical format
5. **VALUABLE RECOMMENDATIONS**: Offer helpful suggestions based on the analysis

**TRANSCRIPT TO ANALYZE**: "${transcript}"

Analyze this voice transcript and provide detailed insights about the content, sentiment, and key characteristics. Return your analysis in valid JSON format with the following structure:

{
  "sentiment": "positive/negative/neutral",
  "confidence": 0.0-1.0,
  "keyPoints": ["point1", "point2", "point3"],
  "topics": ["topic1", "topic2", "topic3"],
  "suggestions": ["suggestion1", "suggestion2"],
  "tone": "professional/casual/enthusiastic/etc",
  "actionItems": ["action1", "action2"],
  "summary": "Brief summary of the content",
  "wordCount": number,
  "speakingPace": "slow/medium/fast"
}

**ANALYSIS GUIDELINES:**
- Be thorough and accurate in your assessment
- Provide specific, actionable insights
- Consider both explicit and implicit meaning
- Focus on what would be most valuable for review generation
- Ensure all JSON values are properly formatted

Analyze the transcript now and return valid JSON:`;

    const completion = await axios.post(
      model.baseURL,
      {
        model: model.name,
        messages: [
          { role: "system", content: "You are an expert voice analysis AI with deep reasoning capabilities. Always return valid JSON only with detailed, accurate, and insightful analysis." },
          { role: "user", content: prompt }
        ],
        temperature: model.temperature,
        max_tokens: model.maxTokens,
        top_p: 0.85,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const response = completion.data.choices[0]?.message?.content || '{}';
    
    // Parse the JSON response
    let analysisData;
    try {
      analysisData = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse analysis response:', parseError);
      analysisData = {
        sentiment: 'neutral',
        confidence: 0.5,
        keyPoints: ['Analysis parsing failed'],
        topics: ['general'],
        suggestions: ['Please try again'],
        tone: 'neutral',
        actionItems: [],
        summary: 'Analysis could not be completed',
        wordCount: transcript.split(' ').length,
        speakingPace: 'medium'
      };
    }

    res.json({
      success: true,
      analysis: analysisData,
      provider: 'NVIDIA Llama 3.1 Nemotron Ultra',
      model: model.name,
      modelDescription: model.description,
      usage: completion.data.usage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Voice analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze voice input',
      code: 'VOICE_ANALYSIS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Voice Review Generation endpoint
app.post('/api/voice/generate-review', async (req, res) => {
  try {
    const { transcript, analysis, reviewType, apiKey } = req.body;

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

    // Select model for review generation
    const model = selectModel('review_generation');
    console.log(`🎯 Using ${model.name} for review generation (${model.description})`);

    // Enhanced prompt for review generation
    const prompt = `You are an expert review writer specializing in creating authentic, engaging, and helpful reviews. 

**REVIEW GENERATION APPROACH:**
1. **AUTHENTIC VOICE**: Write in a natural, personal tone that feels genuine
2. **ENGAGING CONTENT**: Make the review interesting and compelling to read
3. **HELPFUL INSIGHTS**: Provide valuable information for other potential customers
4. **BALANCED PERSPECTIVE**: Include both positive and constructive feedback when appropriate
5. **SPECIFIC DETAILS**: Use concrete examples and specific observations

**REVIEW TYPE**: ${reviewType || 'general'}
**VOICE TRANSCRIPT**: "${transcript}"

**ANALYSIS CONTEXT**: ${analysis ? JSON.stringify(analysis) : 'No analysis provided'}

Create a well-written review that captures the essence of the experience described in the transcript. Make it engaging, authentic, and genuinely helpful to other readers. Focus on the key points and emotions expressed while maintaining a natural, conversational tone.

**REVIEW GUIDELINES:**
- Keep it concise but informative (${model.maxTokens} characters max)
- Use a ${reviewType || 'general'} perspective
- Include specific details from the transcript
- Make it engaging and readable
- Be authentic and honest in tone

Generate the review now:`;

    const completion = await axios.post(
      model.baseURL,
      {
        model: model.name,
        messages: [
          { role: "system", content: "You are an expert review writer with deep understanding of human experiences and excellent writing skills." },
          { role: "user", content: prompt }
        ],
        temperature: model.temperature,
        max_tokens: model.maxTokens,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const generatedReview = completion.data.choices[0]?.message?.content || 'No review generated';
    
    // Save to MongoDB (if available)
    if (mongoose.connection.readyState === 1) {
      try {
        await Review.create({
          review: transcript,
          sentiment: analysis?.sentiment || 'unknown',
          aiResponse: generatedReview,
          handledBy: 'AI',
          type: 'voice_review',
          extra: { analysis, reviewType, apiKey: apiKey ? 'provided' : undefined, model: model.name }
        });
        console.log('💾 Review saved to database');
      } catch (dbError) {
        console.warn('⚠️  Failed to save to database:', dbError.message);
      }
    } else {
      console.log('💾 Database not available, skipping save');
    }

    console.log(`Review generated. Tokens used: ${completion.usage?.total_tokens || 'unknown'}`);

    res.json({
      success: true,
      reviewText: generatedReview,
      provider: 'NVIDIA Llama 3.1 Nemotron Ultra',
      model: model.name,
      modelDescription: model.description,
      usage: completion.usage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Review generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate review',
      code: 'REVIEW_GENERATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Location Suggestion endpoint
app.post('/api/voice/suggest-location', async (req, res) => {
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

    // Create location analysis prompt with enhanced thinking
    const locationPrompt = `**THINKING PROCESS**: Before analyzing for locations, take time to:
1. **READ CAREFULLY**: Understand every detail in the transcript
2. **IDENTIFY CONTEXT**: What type of experience is being described?
3. **LOOK FOR CLUES**: What specific places, businesses, or areas are mentioned?
4. **CONSIDER IMPLICATIONS**: What locations would be relevant to this type of review?
5. **THINK ABOUT RELEVANCE**: What would be most helpful for the user?

Now analyze the following voice transcript for location suggestions:

Transcript: "${sanitizedTranscript}"

Current Location: ${currentLocation ? `${currentLocation.latitude}, ${currentLocation.longitude}` : 'Not provided'}

**ANALYSIS APPROACH**:
- Think about the specific context and type of experience
- Consider both explicit mentions and implicit location clues
- Evaluate what locations would be most relevant and helpful
- Consider the user's intent and what they're trying to accomplish
- Focus on providing genuinely useful location suggestions

Please analyze the transcript and provide location suggestions in the following JSON format:
{
  "suggestions": [
    {
      "name": "Location name",
      "type": "restaurant|hotel|store|attraction|service|other",
      "description": "Brief description of why this location is relevant",
      "confidence": 0.0-1.0,
      "keywords": ["keyword1", "keyword2"],
      "address": "Full address if mentioned or inferred",
      "coordinates": {"latitude": 0.0, "longitude": 0.0} // Only if coordinates are mentioned
    }
  ],
  "analysis": {
    "locationMentioned": true/false,
    "locationType": "restaurant|hotel|store|attraction|service|other|unknown",
    "specificPlace": "Name of specific place if mentioned",
    "cityOrArea": "City or area mentioned",
    "confidence": 0.0-1.0
  }
}

Focus on:
1. Specific business names mentioned
2. Types of establishments (restaurants, hotels, stores, etc.)
3. Geographic locations (cities, neighborhoods, landmarks)
4. Context clues that suggest location types
5. Relevance to the review content

If no specific locations are mentioned, suggest general location types that would be relevant for the type of review being written.`;

    // Use axios to call NVIDIA API
    const completion = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: "meta/llama-3.1-70b-instruct",
        messages: [
          { role: "system", content: "You are a location analysis expert with deep reasoning capabilities. Before analyzing any transcript for locations, take time to think carefully about the content, context, and user intent. Consider what locations would be most relevant and helpful for the specific type of review or experience being described. Focus on providing thoughtful, accurate location suggestions that genuinely add value to the user's review process." },
          { role: "user", content: locationPrompt }
        ],
        temperature: 0.4,
        top_p: 0.85,
        max_tokens: 2048,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const response = completion.data.choices[0]?.message?.content || 'No response generated';
    
    console.log(`Location suggestions generated. Tokens used: ${completion.data.usage?.total_tokens || 'unknown'}`);

    // Try to parse the JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(response);
    } catch (parseError) {
      console.warn('Failed to parse location suggestions JSON:', parseError);
      // Return a fallback response
      suggestions = {
        suggestions: [],
        analysis: {
          locationMentioned: false,
          locationType: 'unknown',
          specificPlace: null,
          cityOrArea: null,
          confidence: 0.0
        }
      };
    }

    // Clean the response
    const cleanedResponse = cleanAIResponse(JSON.stringify(suggestions));

    res.json({
      success: true,
      suggestions: cleanedResponse.suggestions || [],
      analysis: cleanedResponse.analysis || {},
      provider: 'Meta Llama 3.1 70B Instruct',
      usage: completion.data.usage,
      model: "meta/llama-3.1-70b-instruct",
      timestamp: new Date().toISOString()
    });

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
app.post('/api/voice/customer-service-response', async (req, res) => {
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
        code: 'INVALID_SENTIMENT'
      });
    }
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'API key is required and must be a string',
        code: 'INVALID_API_KEY'
      });
    }

    // Only generate response for negative sentiment
    if (sentiment !== 'negative') {
      return res.json({
        success: true,
        message: 'No customer service response needed for non-negative sentiment',
        sentiment: sentiment,
        timestamp: new Date().toISOString()
      });
    }

    // Select model for customer service
    const model = selectModel('customer_service');
    console.log(`🎯 Using ${model.name} for customer service (${model.description})`);

    // Enhanced prompt for customer service response
    const prompt = `You are an expert customer service representative with exceptional empathy, problem-solving skills, and communication abilities.

**CUSTOMER SERVICE APPROACH:**
1. **EMPATHETIC ACKNOWLEDGMENT**: Show genuine understanding of the customer's frustration
2. **PROFESSIONAL TONE**: Maintain a warm, professional, and helpful demeanor
3. **SOLUTION-ORIENTED**: Focus on resolving the issue and improving the situation
4. **ENGAGING COMMUNICATION**: Make the response conversational and engaging
5. **FOLLOW-UP COMMITMENT**: Show commitment to ongoing support and improvement

**CUSTOMER REVIEW**: "${review}"

Create a professional, empathetic customer service response that addresses the customer's concerns while maintaining a positive brand image. The response should be engaging, warm, and genuinely helpful.

**RESPONSE GUIDELINES:**
- Keep it concise but comprehensive (${model.maxTokens} characters max)
- Use an empathetic and professional tone
- Acknowledge the customer's experience
- Offer specific solutions or next steps
- Thank them for their feedback
- Invite further communication if needed
- Be warm and engaging throughout

Generate the customer service response now:`;

    const completion = await axios.post(
      model.baseURL,
      {
        model: model.name,
        messages: [
          { role: "system", content: "You are an expert customer service representative with deep empathy and excellent communication skills." },
          { role: "user", content: prompt }
        ],
        temperature: model.temperature,
        max_tokens: model.maxTokens,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const response = completion.data.choices[0]?.message?.content || 'No response generated';

    // Save to MongoDB (if available)
    if (mongoose.connection.readyState === 1) {
      try {
        await Review.create({
          review,
          sentiment,
          aiResponse: response,
          handledBy: 'AI',
          type: 'customer_service',
          extra: { apiKey: apiKey ? 'provided' : undefined, model: model.name }
        });
        console.log('💾 Customer service response saved to database');
      } catch (dbError) {
        console.warn('⚠️  Failed to save to database:', dbError.message);
      }
    } else {
      console.log('💾 Database not available, skipping save');
    }

    res.json({
      success: true,
      response,
      provider: 'NVIDIA Llama 3.1 Nemotron Ultra',
      model: model.name,
      modelDescription: model.description,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Customer service response error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate customer service response',
      code: 'CUSTOMER_SERVICE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Fetch all reviews and customer service responses
app.get('/api/reviews', async (req, res) => {
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

// Get available LLM models and their configurations
app.get('/api/models', (req, res) => {
  try {
    const models = Object.keys(LLM_MODELS).map(key => {
      const model = LLM_MODELS[key];
      return {
        key: key,
        name: model.name,
        description: model.description,
        strengths: model.strengths,
        temperature: model.temperature,
        maxTokens: model.maxTokens,
        useCase: key
      };
    });

    res.json({
      success: true,
      models: models,
      useCases: {
        review_generation: 'Creative, engaging review generation with high temperature for variety',
        customer_service: 'Empathetic, professional customer service responses',
        voice_analysis: 'Detailed, accurate voice analysis with low temperature for consistency'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch model information' });
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ReviewGen Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Llama API: http://localhost:${PORT}/api/llama`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  if (!process.env.NVIDIA_API_KEY) {
    console.warn('⚠️  NVIDIA_API_KEY not found in environment variables');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app; 
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

module.exports = {
    cleanAIResponse,
    formatForEnhancedDepthAndRelevance,
    analyzeEnhancedContentStructure,
    extractTopicKeywords,
    capitalizeFirst
}; 
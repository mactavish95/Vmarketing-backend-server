const axios = require('axios');
const { cleanAIResponse } = require('../utils/responseFormatter');
const { analyzeConversationFlow, enhanceUserMessage } = require('../utils/conversationUtils');

class LlamaService {
    constructor() {
        this.baseURL = 'https://integrate.api.nvidia.com/v1/chat/completions';
        this.model = 'meta/llama-3.1-70b-instruct';
    }

    // Generate conversational response
    async generateConversationalResponse(text, apiKey, conversationHistory = []) {
        try {
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
                content: text
            });

            const completion = await axios.post(
                this.baseURL,
                {
                    model: this.model,
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
            const cleanedResponse = cleanAIResponse(response);

            return {
                success: true,
                response: cleanedResponse,
                usage: completion.data.usage,
                model: this.model,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw this.handleAPIError(error);
        }
    }

    // Analyze voice input
    async analyzeVoiceInput(transcript, apiKey) {
        try {
            const analysisPrompt = `**THINKING PROCESS**: Before analyzing, take time to:
1. Read and understand the transcript completely
2. Consider the context and intent behind the words
3. Identify the emotional undertones and nuances
4. Think about what the speaker is really trying to convey
5. Consider the broader implications and themes

Now analyze the following voice transcript with deep reasoning and provide a comprehensive analysis in JSON format.

Transcript: "${transcript}"

**ANALYSIS APPROACH**:
- Think about the speaker's emotional state and intentions
- Consider the context and background that might influence their words
- Identify both explicit and implicit meanings
- Evaluate the overall impact and effectiveness of their communication
- Consider what insights would be most valuable for understanding this content

Please provide analysis in this exact JSON structure:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0,
  "keyPoints": ["point1", "point2", "point3"],
  "topics": ["topic1", "topic2", "topic3"],
  "suggestions": ["suggestion1", "suggestion2"],
  "tone": "formal|casual|professional|friendly|serious|enthusiastic",
  "actionItems": ["action1", "action2"],
  "summary": "Brief summary of the content",
  "wordCount": number,
  "speakingPace": "slow|normal|fast"
}

Focus on:
- Sentiment analysis (positive, negative, neutral)
- Key points and main ideas
- Topics and themes discussed
- Tone and speaking style
- Actionable suggestions
- Overall summary
- Word count and speaking pace estimation

Return only valid JSON, no additional text.`;

            const completion = await axios.post(
                this.baseURL,
                {
                    model: this.model,
                    messages: [
                        { 
                            role: "system", 
                            content: "You are an expert voice analysis AI with deep reasoning capabilities. Before analyzing any transcript, take time to think deeply about the content, context, and implications. Consider the speaker's emotions, intentions, and the broader meaning behind their words. Provide thoughtful, well-reasoned analysis that captures both explicit and implicit aspects of the communication. Always return valid JSON only with detailed, accurate, and insightful analysis." 
                        },
                        { role: "user", content: analysisPrompt }
                    ],
                    temperature: 0.2,
                    top_p: 0.85,
                    max_tokens: 3072,
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
                // Fallback analysis
                analysisData = {
                    sentiment: 'neutral',
                    confidence: 0.5,
                    keyPoints: ['Content analyzed'],
                    topics: ['General'],
                    suggestions: ['Consider providing more context'],
                    tone: 'neutral',
                    actionItems: ['Review transcript'],
                    summary: 'Voice content was processed',
                    wordCount: transcript.split(' ').length,
                    speakingPace: 'normal'
                };
            }

            // Ensure all required fields are present
            const defaultAnalysis = {
                sentiment: 'neutral',
                confidence: 0.5,
                keyPoints: [],
                topics: [],
                suggestions: [],
                tone: 'neutral',
                actionItems: [],
                summary: 'Analysis completed',
                wordCount: transcript.split(' ').length,
                speakingPace: 'normal'
            };

            const finalAnalysis = { ...defaultAnalysis, ...analysisData };
            const cleanedResponse = cleanAIResponse(JSON.stringify(finalAnalysis));

            return {
                success: true,
                analysis: cleanedResponse,
                provider: 'Meta Llama 3.1 70B Instruct',
                usage: completion.data.usage,
                model: this.model,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw this.handleAPIError(error);
        }
    }

    // Generate review from voice input
    async generateReviewFromVoice(transcript, apiKey, reviewType = 'general') {
        try {
            // Define different sentence structures and formats for different review types
            const reviewFormats = {
                restaurant: {
                    opening: [
                        "Just had dinner at this place and...",
                        "Visited this restaurant recently and...",
                        "Tried this spot for the first time and...",
                        "Went here for a meal and...",
                        "Stopped by this restaurant and..."
                    ],
                    structure: "experience → atmosphere → food → service → recommendation",
                    tone: "casual, food-focused, experiential"
                },
                hotel: {
                    opening: [
                        "Stayed at this hotel and...",
                        "Booked a room here and...",
                        "Spent the night at this place and...",
                        "Checked into this hotel and...",
                        "Had an overnight stay here and..."
                    ],
                    structure: "arrival → room → amenities → service → overall experience",
                    tone: "detailed, service-oriented, comfort-focused"
                },
                product: {
                    opening: [
                        "Bought this product and...",
                        "Tried out this item and...",
                        "Purchased this recently and...",
                        "Got my hands on this and...",
                        "Tested this product and..."
                    ],
                    structure: "purchase → first impressions → usage → pros/cons → verdict",
                    tone: "analytical, feature-focused, practical"
                },
                service: {
                    opening: [
                        "Used this service and...",
                        "Hired this company and...",
                        "Tried this service out and...",
                        "Went with this provider and...",
                        "Engaged this service and..."
                    ],
                    structure: "need → selection → experience → results → satisfaction",
                    tone: "professional, results-oriented, value-focused"
                },
                experience: {
                    opening: [
                        "Had this experience and...",
                        "Went through this and...",
                        "Tried this activity and...",
                        "Participated in this and...",
                        "Experienced this and..."
                    ],
                    structure: "expectations → reality → highlights → challenges → overall",
                    tone: "personal, emotional, narrative-driven"
                },
                app: {
                    opening: [
                        "Downloaded this app and...",
                        "Tried this software and...",
                        "Used this application and...",
                        "Tested this app and...",
                        "Installed this and..."
                    ],
                    structure: "discovery → interface → functionality → performance → recommendation",
                    tone: "technical, user-experience focused, feature-aware"
                },
                place: {
                    opening: [
                        "Visited this place and...",
                        "Went to this location and...",
                        "Explored this area and...",
                        "Checked out this spot and...",
                        "Stopped by this place and..."
                    ],
                    structure: "arrival → atmosphere → activities → highlights → recommendation",
                    tone: "descriptive, location-focused, experiential"
                },
                general: {
                    opening: [
                        "Tried this out and...",
                        "Experienced this and...",
                        "Went with this option and...",
                        "Chose this and...",
                        "Decided to try this and..."
                    ],
                    structure: "context → experience → evaluation → conclusion",
                    tone: "balanced, informative, personal"
                }
            };

            const format = reviewFormats[reviewType] || reviewFormats.general;
            const selectedOpening = format.opening[Math.floor(Math.random() * format.opening.length)];

            const reviewPrompt = `**THINKING PROCESS**: Before writing this review, take time to:
1. **UNDERSTAND THE EXPERIENCE**: What exactly happened? What were the key moments?
2. **ANALYZE THE EMOTIONS**: How did the person feel? What emotions were expressed?
3. **IDENTIFY THE CORE MESSAGE**: What's the main point they want to convey?
4. **CONSIDER THE CONTEXT**: What type of experience is this? What would readers care about?
5. **THINK ABOUT IMPACT**: What would make this review genuinely helpful to others?

Now write a natural, conversational review based on this voice input:

Voice input: "${transcript}"

Review type: ${reviewType}

**REVIEW FORMAT**:
- Opening style: ${selectedOpening}
- Structure: ${format.structure}
- Tone: ${format.tone}

**WRITING APPROACH**:
- Use varied sentence structures (mix short and long sentences)
- Include specific details and sensory descriptions
- Vary your language patterns (avoid repetitive phrases)
- Use natural transitions between ideas
- Include personal insights and honest opinions
- Make it feel conversational and authentic

**SENTENCE STRUCTURE VARIATIONS**:
- Start some sentences with time markers: "When I first...", "After that...", "Later on..."
- Use descriptive phrases: "What really stood out was...", "The best part was...", "I was surprised by..."
- Include comparisons: "Unlike other places...", "Compared to...", "Similar to..."
- Add personal touches: "I personally think...", "For me...", "I found that..."
- Use conditional statements: "If you're looking for...", "When you visit...", "Should you decide to..."

Write a review that:
- Starts naturally with "${selectedOpening}"
- Follows the ${format.structure} structure
- Maintains a ${format.tone} tone throughout
- Uses varied sentence patterns and lengths
- Feels genuine and personal
- Provides specific, helpful insights
- Avoids generic or template-like language

Make it sound like a real person sharing their honest, thoughtful experience with natural language flow.`;

            const completion = await axios.post(
                this.baseURL,
                {
                    model: this.model,
                    messages: [
                        { 
                            role: "system", 
                            content: "You are an expert review writer with deep reasoning and empathy. Before writing any review, take time to think deeply about the experience being described. Consider the emotions, context, and impact of what happened. Think about what would be most valuable and helpful to potential readers. Focus on creating authentic, thoughtful narratives that capture the true essence of the experience while providing genuine insights and value. Write reviews that feel personal, honest, and genuinely helpful." 
                        },
                        { role: "user", content: reviewPrompt }
                    ],
                    temperature: 0.8,
                    top_p: 0.9,
                    max_tokens: 1500,
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
            const cleanedResponse = cleanAIResponse(generatedReview);

            return {
                success: true,
                review: cleanedResponse,
                provider: 'Meta Llama 3.1 70B Instruct',
                usage: completion.data.usage,
                model: this.model,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw this.handleAPIError(error);
        }
    }

    // Generate location suggestions
    async generateLocationSuggestions(transcript, apiKey, currentLocation = null) {
        try {
            const locationPrompt = `**THINKING PROCESS**: Before analyzing for locations, take time to:
1. **READ CAREFULLY**: Understand every detail in the transcript
2. **IDENTIFY CONTEXT**: What type of experience is being described?
3. **LOOK FOR CLUES**: What specific places, businesses, or areas are mentioned?
4. **CONSIDER IMPLICATIONS**: What locations would be relevant to this type of review?
5. **THINK ABOUT RELEVANCE**: What would be most helpful for the user?

Now analyze the following voice transcript for location suggestions:

Transcript: "${transcript}"

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

            const completion = await axios.post(
                this.baseURL,
                {
                    model: this.model,
                    messages: [
                        { 
                            role: "system", 
                            content: "You are a location analysis expert with deep reasoning capabilities. Before analyzing any transcript for locations, take time to think carefully about the content, context, and user intent. Consider what locations would be most relevant and helpful for the specific type of review or experience being described. Focus on providing thoughtful, accurate location suggestions that genuinely add value to the user's review process." 
                        },
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

            const cleanedResponse = cleanAIResponse(JSON.stringify(suggestions));

            return {
                success: true,
                suggestions: cleanedResponse.suggestions || [],
                analysis: cleanedResponse.analysis || {},
                provider: 'Meta Llama 3.1 70B Instruct',
                usage: completion.data.usage,
                model: this.model,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw this.handleAPIError(error);
        }
    }

    // Generate customer service response
    async generateCustomerServiceResponse(review, apiKey) {
        try {
            // Generate a random staff name for personalization
            const staffNames = ['Sarah', 'Mike', 'Lisa', 'David', 'Emma', 'Alex', 'Rachel', 'Tom', 'Jessica', 'Chris', 'Maria', 'James', 'Amanda', 'Kevin', 'Nicole', 'Brandon', 'Stephanie', 'Ryan', 'Michelle', 'Jason', 'Danielle', 'Robert', 'Jennifer', 'Michael', 'Ashley', 'Tyler', 'Lauren', 'Derek', 'Samantha', 'Marcus', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley'];
            const staffName = staffNames[Math.floor(Math.random() * staffNames.length)];

            const prompt = `You are ${staffName}, a real customer relationship agent having a casual, friendly chat with a customer.

The customer left this review: "${review}"

Respond as if you're having a warm, personal conversation with them. Be:
- Super friendly and chatty (like "Thanks a mil!" and "totally get it")
- Empathetic and understanding
- Personal and warm
- Proactive about helping
- Conversational and natural

Structure your response as ONE comprehensive message that includes:
1. A warm, personal greeting with your name
2. Empathy and understanding of their experience
3. Specific actions you'll take to address their concerns
4. An invitation to continue the conversation

Keep it conversational, warm, and human - like you're actually chatting with a friend. Use contractions, casual language, and make it feel personal.`;

            const response = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
                model: 'meta/llama-3.1-70b-instruct',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a friendly, empathetic customer relationship agent. Respond in a warm, personal, and conversational tone. Use casual language, contractions, and make the customer feel heard and valued. Be proactive about helping and maintain a genuine, caring personality throughout the conversation.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                top_p: 0.85,
                max_tokens: 1024,
                frequency_penalty: 0.1,
                presence_penalty: 0.1,
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.choices && response.data.choices[0]) {
                const generatedResponse = response.data.choices[0].message.content.trim();
                
                return {
                    success: true,
                    response: generatedResponse,
                    staffName: staffName
                };
            } else {
                throw new Error('Invalid response format from API');
            }
        } catch (error) {
            console.error('Customer service response generation error:', error);
            return {
                success: false,
                error: error.response?.data?.detail || error.message || 'Failed to generate customer service response'
            };
        }
    }

    // Handle API errors
    handleAPIError(error) {
        console.error('Llama API Error:', error);
        
        // Handle specific error types
        if (error.status === 401 || error.code === 'authentication_error') {
            return {
                success: false,
                error: 'Invalid or missing NVIDIA API key. Please check your API key configuration.',
                code: 'INVALID_API_KEY'
            };
        }

        if (error.code === 'insufficient_quota') {
            return {
                success: false,
                error: 'API quota exceeded. Please try again later.',
                code: 'QUOTA_EXCEEDED'
            };
        }

        if (error.code === 'rate_limit_exceeded') {
            return {
                success: false,
                error: 'Rate limit exceeded. Please try again later.',
                code: 'RATE_LIMIT_EXCEEDED'
            };
        }

        // Generic error response
        return {
            success: false,
            error: 'Failed to generate response',
            code: 'LLAMA_API_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        };
    }
}

module.exports = new LlamaService(); 
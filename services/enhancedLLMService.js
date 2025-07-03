const axios = require('axios');
const { cleanAIResponse } = require('../utils/responseFormatter');
const { analyzeConversationFlow, enhanceUserMessage } = require('../utils/conversationUtils');

class EnhancedLLMService {
    constructor() {
        this.models = {
            llama: {
                name: 'meta/llama-3.1-70b-instruct',
                baseURL: 'https://integrate.api.nvidia.com/v1/chat/completions',
                strengths: ['conversation', 'creative_writing', 'analysis'],
                temperature: 0.6,
                maxTokens: 3072
            },
            gpt4: {
                name: 'gpt-4',
                baseURL: 'https://api.openai.com/v1/chat/completions',
                strengths: ['reasoning', 'structured_analysis', 'technical'],
                temperature: 0.4,
                maxTokens: 4000
            },
            claude: {
                name: 'claude-3-sonnet-20240229',
                baseURL: 'https://api.anthropic.com/v1/messages',
                strengths: ['empathy', 'customer_service', 'detailed_analysis'],
                temperature: 0.3,
                maxTokens: 4000
            },
            gemini: {
                name: 'gemini-pro',
                baseURL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
                strengths: ['multimodal', 'creative', 'diverse_responses'],
                temperature: 0.7,
                maxTokens: 2048
            }
        };
        
        this.responsePatterns = {
            conversation: {
                structure: ['greeting', 'main_content', 'engagement', 'closing'],
                tone: ['friendly', 'casual', 'engaging'],
                length: 'medium',
                complexity: 'moderate'
            },
            analysis: {
                structure: ['summary', 'key_findings', 'insights', 'recommendations'],
                tone: ['professional', 'objective', 'detailed'],
                length: 'long',
                complexity: 'high'
            },
            customer_service: {
                structure: ['acknowledgment', 'understanding', 'solution', 'follow_up'],
                tone: ['empathetic', 'professional', 'helpful'],
                length: 'medium',
                complexity: 'moderate'
            },
            review: {
                structure: ['experience', 'highlights', 'details', 'recommendation'],
                tone: ['personal', 'authentic', 'informative'],
                length: 'medium',
                complexity: 'moderate'
            }
        };
    }

    // Analyze the input to determine the best model and approach
    async analyzeInputAndSelectModel(input, context = {}) {
        const analysis = {
            contentType: this.detectContentType(input),
            complexity: this.assessComplexity(input),
            sentiment: this.detectSentiment(input),
            urgency: this.assessUrgency(input),
            domain: this.detectDomain(input),
            userIntent: this.inferUserIntent(input, context)
        };

        const selectedModel = this.selectOptimalModel(analysis, context);
        const responseStrategy = this.generateResponseStrategy(analysis, selectedModel);

        return {
            analysis,
            selectedModel,
            responseStrategy,
            confidence: this.calculateConfidence(analysis)
        };
    }

    // Detect the type of content being processed
    detectContentType(input) {
        const text = input.toLowerCase();
        
        if (text.includes('hello') || text.includes('hi') || text.includes('how are you')) {
            return 'conversation';
        }
        
        if (text.includes('analyze') || text.includes('analysis') || text.includes('sentiment')) {
            return 'analysis';
        }
        
        if (text.includes('review') || text.includes('experience') || text.includes('visit')) {
            return 'review';
        }
        
        if (text.includes('problem') || text.includes('issue') || text.includes('complaint')) {
            return 'customer_service';
        }
        
        if (text.includes('question') || text.includes('help') || text.includes('explain')) {
            return 'inquiry';
        }
        
        return 'general';
    }

    // Assess the complexity of the input
    assessComplexity(input) {
        const wordCount = input.split(' ').length;
        const sentenceCount = input.split(/[.!?]+/).length;
        const avgWordsPerSentence = wordCount / sentenceCount;
        
        if (wordCount > 100 && avgWordsPerSentence > 15) return 'high';
        if (wordCount > 50 && avgWordsPerSentence > 10) return 'medium';
        return 'low';
    }

    // Detect sentiment in the input
    detectSentiment(input) {
        const text = input.toLowerCase();
        const positiveWords = ['good', 'great', 'amazing', 'excellent', 'love', 'like', 'happy', 'satisfied'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'disappointed', 'angry', 'frustrated'];
        
        const positiveCount = positiveWords.filter(word => text.includes(word)).length;
        const negativeCount = negativeWords.filter(word => text.includes(word)).length;
        
        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }

    // Assess urgency of the request
    assessUrgency(input) {
        const text = input.toLowerCase();
        const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'now'];
        
        return urgentWords.some(word => text.includes(word)) ? 'high' : 'normal';
    }

    // Detect the domain/context
    detectDomain(input) {
        const text = input.toLowerCase();
        
        if (text.includes('restaurant') || text.includes('food') || text.includes('dining')) {
            return 'restaurant';
        }
        
        if (text.includes('hotel') || text.includes('accommodation') || text.includes('stay')) {
            return 'hospitality';
        }
        
        if (text.includes('product') || text.includes('purchase') || text.includes('buy')) {
            return 'retail';
        }
        
        if (text.includes('service') || text.includes('support') || text.includes('help')) {
            return 'service';
        }
        
        if (text.includes('technology') || text.includes('app') || text.includes('software')) {
            return 'technology';
        }
        
        return 'general';
    }

    // Infer user intent
    inferUserIntent(input, context) {
        const text = input.toLowerCase();
        
        if (text.includes('?')) return 'question';
        if (text.includes('help') || text.includes('support')) return 'support';
        if (text.includes('review') || text.includes('feedback')) return 'feedback';
        if (text.includes('complain') || text.includes('issue')) return 'complaint';
        if (text.includes('suggest') || text.includes('recommend')) return 'recommendation';
        
        return 'general';
    }

    // Select the optimal model based on analysis
    selectOptimalModel(analysis, context) {
        const { contentType, complexity, sentiment, urgency, domain, userIntent } = analysis;
        
        // Customer service scenarios
        if (contentType === 'customer_service' || userIntent === 'complaint') {
            return this.models.claude; // Best for empathy and customer service
        }
        
        // Complex analysis scenarios
        if (contentType === 'analysis' || complexity === 'high') {
            return this.models.gpt4; // Best for reasoning and structured analysis
        }
        
        // Creative or diverse responses
        if (contentType === 'review' || domain === 'general') {
            return this.models.gemini; // Good for creative and diverse responses
        }
        
        // Default to Llama for general conversation
        return this.models.llama;
    }

    // Generate response strategy based on analysis
    generateResponseStrategy(analysis, selectedModel) {
        const { contentType, complexity, sentiment, urgency } = analysis;
        
        const strategy = {
            model: selectedModel,
            temperature: selectedModel.temperature,
            maxTokens: selectedModel.maxTokens,
            structure: this.responsePatterns[contentType]?.structure || ['main_content'],
            tone: this.responsePatterns[contentType]?.tone || ['professional'],
            length: this.responsePatterns[contentType]?.length || 'medium',
            complexity: this.responsePatterns[contentType]?.complexity || 'moderate',
            enhancements: []
        };

        // Adjust strategy based on analysis
        if (urgency === 'high') {
            strategy.temperature = Math.min(strategy.temperature + 0.2, 1.0);
            strategy.enhancements.push('urgent_response');
        }

        if (sentiment === 'negative') {
            strategy.enhancements.push('empathetic_tone');
            strategy.tone.push('empathetic');
        }

        if (complexity === 'high') {
            strategy.maxTokens = Math.min(strategy.maxTokens * 1.5, 8000);
            strategy.enhancements.push('detailed_explanation');
        }

        return strategy;
    }

    // Calculate confidence in the analysis
    calculateConfidence(analysis) {
        let confidence = 0.5; // Base confidence
        
        // Increase confidence based on clear indicators
        if (analysis.contentType !== 'general') confidence += 0.2;
        if (analysis.sentiment !== 'neutral') confidence += 0.1;
        if (analysis.domain !== 'general') confidence += 0.1;
        if (analysis.userIntent !== 'general') confidence += 0.1;
        
        return Math.min(confidence, 1.0);
    }

    // Generate enhanced response using the selected model and strategy
    async generateEnhancedResponse(input, apiKey, context = {}) {
        try {
            // Analyze input and select optimal approach
            const analysis = await this.analyzeInputAndSelectModel(input, context);
            const { selectedModel, responseStrategy } = analysis;

            console.log(`🎯 Selected model: ${selectedModel.name} for ${analysis.analysis.contentType} content`);

            // Generate response using selected model
            const response = await this.callModelAPI(input, selectedModel, responseStrategy, apiKey, context);
            
            // Analyze and enhance the response
            const enhancedResponse = await this.analyzeAndEnhanceResponse(response, analysis, context);
            
            return {
                success: true,
                response: enhancedResponse,
                analysis: analysis.analysis,
                model: selectedModel.name,
                strategy: responseStrategy,
                confidence: analysis.confidence,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Enhanced LLM service error:', error);
            throw this.handleAPIError(error);
        }
    }

    // Call the appropriate model API
    async callModelAPI(input, model, strategy, apiKey, context) {
        const messages = this.buildMessages(input, model, strategy, context);
        
        if (model.name.includes('llama')) {
            return await this.callLlamaAPI(messages, model, strategy, apiKey);
        } else if (model.name.includes('gpt')) {
            return await this.callOpenAIAPI(messages, model, strategy, apiKey);
        } else if (model.name.includes('claude')) {
            return await this.callAnthropicAPI(messages, model, strategy, apiKey);
        } else if (model.name.includes('gemini')) {
            return await this.callGeminiAPI(messages, model, strategy, apiKey);
        }
        
        throw new Error(`Unsupported model: ${model.name}`);
    }

    // Build messages for the selected model
    buildMessages(input, model, strategy, context) {
        const systemPrompt = this.generateSystemPrompt(model, strategy, context);
        
        return [
            {
                role: "system",
                content: systemPrompt
            },
            {
                role: "user",
                content: input
            }
        ];
    }

    // Generate system prompt based on model and strategy
    generateSystemPrompt(model, strategy, context) {
        const basePrompt = `You are an intelligent AI assistant with deep reasoning capabilities and excellent conversational skills.`;

        const modelSpecificPrompts = {
            'meta/llama-3.1-70b-instruct': `
${basePrompt}

**CONVERSATION STRUCTURE APPROACH**:
1. **CONTEXT ANALYSIS**: Understand the conversation flow, user's intent, and emotional state
2. **THOUGHTFUL PROCESSING**: Consider the broader context and implications of the query
3. **STRUCTURED RESPONSE**: Organize your thoughts in a clear, logical flow
4. **ENGAGING DELIVERY**: Make responses conversational, natural, and engaging
5. **FOLLOW-UP AWARENESS**: Consider how your response might lead to further conversation

**RESPONSE CHARACTERISTICS**:
- Structure: ${strategy.structure.join(', ')}
- Tone: ${strategy.tone.join(', ')}
- Length: ${strategy.length}
- Complexity: ${strategy.complexity}
${strategy.enhancements.length > 0 ? `- Enhancements: ${strategy.enhancements.join(', ')}` : ''}

Your responses should feel natural, engaging, and genuinely helpful while maintaining excellent conversational flow.`,

            'gpt-4': `
${basePrompt}

**ANALYTICAL APPROACH**:
1. **DEEP ANALYSIS**: Thoroughly analyze the input for underlying patterns and implications
2. **STRUCTURED THINKING**: Organize thoughts in a logical, systematic manner
3. **COMPREHENSIVE RESPONSE**: Provide detailed, well-reasoned responses
4. **PRECISION**: Focus on accuracy and clarity in communication
5. **INSIGHT GENERATION**: Offer valuable insights and perspectives

**RESPONSE CHARACTERISTICS**:
- Structure: ${strategy.structure.join(', ')}
- Tone: ${strategy.tone.join(', ')}
- Length: ${strategy.length}
- Complexity: ${strategy.complexity}
${strategy.enhancements.length > 0 ? `- Enhancements: ${strategy.enhancements.join(', ')}` : ''}

Provide thoughtful, well-structured responses that demonstrate deep understanding and analytical thinking.`,

            'claude-3-sonnet-20240229': `
${basePrompt}

**EMPATHETIC APPROACH**:
1. **EMOTIONAL INTELLIGENCE**: Understand and respond to emotional undertones
2. **EMPATHETIC COMMUNICATION**: Show genuine care and understanding
3. **HELPFUL SOLUTIONS**: Focus on providing practical, helpful solutions
4. **PROFESSIONAL WARMTH**: Maintain professionalism while being warm and approachable
5. **CUSTOMER-CENTRIC**: Always prioritize the user's needs and concerns

**RESPONSE CHARACTERISTICS**:
- Structure: ${strategy.structure.join(', ')}
- Tone: ${strategy.tone.join(', ')}
- Length: ${strategy.length}
- Complexity: ${strategy.complexity}
${strategy.enhancements.length > 0 ? `- Enhancements: ${strategy.enhancements.join(', ')}` : ''}

Provide empathetic, helpful responses that genuinely address the user's needs and concerns.`,

            'gemini-pro': `
${basePrompt}

**CREATIVE APPROACH**:
1. **INNOVATIVE THINKING**: Offer creative and diverse perspectives
2. **ENGAGING COMMUNICATION**: Make responses interesting and engaging
3. **VERSATILE STYLE**: Adapt communication style to different contexts
4. **MEMORABLE CONTENT**: Create responses that are memorable and impactful
5. **BALANCED CREATIVITY**: Balance creativity with practicality and usefulness

**RESPONSE CHARACTERISTICS**:
- Structure: ${strategy.structure.join(', ')}
- Tone: ${strategy.tone.join(', ')}
- Length: ${strategy.length}
- Complexity: ${strategy.complexity}
${strategy.enhancements.length > 0 ? `- Enhancements: ${strategy.enhancements.join(', ')}` : ''}

Provide creative, engaging responses that are both memorable and genuinely helpful.`
        };

        return modelSpecificPrompts[model.name] || modelSpecificPrompts['meta/llama-3.1-70b-instruct'];
    }

    // Call Llama API
    async callLlamaAPI(messages, model, strategy, apiKey) {
        const response = await axios.post(
            model.baseURL,
            {
                model: model.name,
                messages: messages,
                temperature: strategy.temperature,
                top_p: 0.85,
                max_tokens: strategy.maxTokens,
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

        return response.data.choices[0]?.message?.content || 'No response generated';
    }

    // Call OpenAI API
    async callOpenAIAPI(messages, model, strategy, apiKey) {
        const response = await axios.post(
            model.baseURL,
            {
                model: model.name,
                messages: messages,
                temperature: strategy.temperature,
                max_tokens: strategy.maxTokens,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1,
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0]?.message?.content || 'No response generated';
    }

    // Call Anthropic API
    async callAnthropicAPI(messages, model, strategy, apiKey) {
        const response = await axios.post(
            model.baseURL,
            {
                model: model.name,
                max_tokens: strategy.maxTokens,
                messages: messages,
                temperature: strategy.temperature,
            },
            {
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.content[0]?.text || 'No response generated';
    }

    // Call Gemini API
    async callGeminiAPI(messages, model, strategy, apiKey) {
        const response = await axios.post(
            `${model.baseURL}?key=${apiKey}`,
            {
                contents: messages.map(msg => ({
                    parts: [{ text: msg.content }]
                })),
                generationConfig: {
                    temperature: strategy.temperature,
                    maxOutputTokens: strategy.maxTokens,
                    topP: 0.9,
                    topK: 40
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.candidates[0]?.content?.parts[0]?.text || 'No response generated';
    }

    // Analyze and enhance the generated response
    async analyzeAndEnhanceResponse(response, analysis, context) {
        // Clean the response
        let enhancedResponse = cleanAIResponse(response);
        
        // Apply response-specific enhancements
        enhancedResponse = this.applyResponseEnhancements(enhancedResponse, analysis, context);
        
        // Validate response quality
        const qualityScore = this.assessResponseQuality(enhancedResponse, analysis);
        
        // If quality is low, try to improve it
        if (qualityScore < 0.7) {
            enhancedResponse = await this.improveResponseQuality(enhancedResponse, analysis, context);
        }
        
        return enhancedResponse;
    }

    // Apply specific enhancements based on analysis
    applyResponseEnhancements(response, analysis, context) {
        let enhanced = response;
        
        // Add urgency indicators if needed
        if (analysis.analysis.urgency === 'high') {
            enhanced = enhanced.replace(/^/, '⚡ ');
        }
        
        // Add empathy indicators for negative sentiment
        if (analysis.analysis.sentiment === 'negative') {
            enhanced = enhanced.replace(/^/, '🤝 ');
        }
        
        // Add domain-specific formatting
        if (analysis.analysis.domain !== 'general') {
            enhanced = this.addDomainSpecificFormatting(enhanced, analysis.analysis.domain);
        }
        
        return enhanced;
    }

    // Add domain-specific formatting
    addDomainSpecificFormatting(response, domain) {
        const domainFormatters = {
            restaurant: (text) => text.replace(/^/, '🍽️ '),
            hospitality: (text) => text.replace(/^/, '🏨 '),
            retail: (text) => text.replace(/^/, '🛍️ '),
            service: (text) => text.replace(/^/, '🛠️ '),
            technology: (text) => text.replace(/^/, '💻 ')
        };
        
        return domainFormatters[domain] ? domainFormatters[domain](response) : response;
    }

    // Assess response quality
    assessResponseQuality(response, analysis) {
        let score = 0.5; // Base score
        
        // Length appropriateness
        const wordCount = response.split(' ').length;
        const expectedLength = analysis.responseStrategy.length === 'long' ? 200 : 
                              analysis.responseStrategy.length === 'medium' ? 100 : 50;
        
        if (Math.abs(wordCount - expectedLength) < 50) score += 0.2;
        
        // Structure adherence
        const hasStructure = analysis.responseStrategy.structure.some(structure => 
            response.toLowerCase().includes(structure.replace('_', ' '))
        );
        if (hasStructure) score += 0.2;
        
        // Tone appropriateness
        const toneWords = {
            'professional': ['professional', 'expert', 'analysis', 'recommendation'],
            'casual': ['cool', 'awesome', 'great', 'nice'],
            'empathetic': ['understand', 'sorry', 'apologize', 'care']
        };
        
        const expectedTone = analysis.responseStrategy.tone[0];
        const toneWordCount = toneWords[expectedTone]?.filter(word => 
            response.toLowerCase().includes(word)
        ).length || 0;
        
        if (toneWordCount > 0) score += 0.1;
        
        return Math.min(score, 1.0);
    }

    // Improve response quality if needed
    async improveResponseQuality(response, analysis, context) {
        // For now, return the original response
        // In a full implementation, this could call another model to improve the response
        console.log(`⚠️ Response quality score: ${this.assessResponseQuality(response, analysis)}`);
        return response;
    }

    // Handle API errors
    handleAPIError(error) {
        console.error('Enhanced LLM Service Error:', error);
        
        if (error.status === 401 || error.code === 'authentication_error') {
            return {
                success: false,
                error: 'Invalid or missing API key. Please check your API key configuration.',
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

        return {
            success: false,
            error: 'Failed to generate enhanced response',
            code: 'ENHANCED_LLM_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        };
    }
}

module.exports = new EnhancedLLMService(); 
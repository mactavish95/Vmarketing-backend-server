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

module.exports = {
    analyzeConversationFlow,
    hasTopicContinuity,
    enhanceUserMessage
}; 
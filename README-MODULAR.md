# Modular Server Structure

This document describes the new modular structure of the ReviewGen backend server, which has been broken down into smaller, more maintainable modules.

## 📁 Directory Structure

```
server/
├── config/
│   └── database.js          # MongoDB connection and schema definitions
├── middleware/
│   └── security.js          # Security middleware (CORS, rate limiting, etc.)
├── routes/
│   ├── llama.js             # Llama API endpoints
│   ├── voice.js             # Voice analysis and review generation endpoints
│   ├── reviews.js           # Review management endpoints
│   └── health.js            # Health check endpoints
├── services/
│   └── llamaService.js      # NVIDIA API service layer
├── utils/
│   ├── responseFormatter.js # AI response cleaning and formatting
│   └── conversationUtils.js # Conversation flow analysis utilities
├── server-new.js            # New modular server entry point
├── server.js                # Original monolithic server (for reference)
└── README-MODULAR.md        # This file
```

## 🔧 Module Descriptions

### Config Module (`config/database.js`)
- **Purpose**: Database connection and schema management
- **Exports**: 
  - `connectToMongoDB()`: MongoDB connection function
  - `Review`: Mongoose model for reviews
  - `mongoose`: Mongoose instance

### Security Middleware (`middleware/security.js`)
- **Purpose**: Security and performance middleware
- **Exports**:
  - `securityMiddleware`: Helmet security headers
  - `limiter`: Rate limiting configuration
  - `corsOptions`: CORS configuration
  - `compressionMiddleware`: Response compression
  - `loggingMiddleware`: Request logging

### Llama Service (`services/llamaService.js`)
- **Purpose**: NVIDIA API interactions and response processing
- **Methods**:
  - `generateConversationalResponse()`: Chat responses
  - `analyzeVoiceInput()`: Voice analysis
  - `generateReviewFromVoice()`: Review generation
  - `generateLocationSuggestions()`: Location suggestions
  - `generateCustomerServiceResponse()`: Customer service responses
  - `handleAPIError()`: Error handling

### Response Formatter (`utils/responseFormatter.js`)
- **Purpose**: AI response cleaning and formatting
- **Functions**:
  - `cleanAIResponse()`: Remove AI artifacts and format responses
  - `formatForEnhancedDepthAndRelevance()`: Enhanced formatting
  - `analyzeEnhancedContentStructure()`: Content structure analysis
  - Various formatting functions for different content types

### Conversation Utils (`utils/conversationUtils.js`)
- **Purpose**: Conversation flow analysis and context management
- **Functions**:
  - `analyzeConversationFlow()`: Analyze conversation history
  - `hasTopicContinuity()`: Check topic continuity
  - `enhanceUserMessage()`: Add context to user messages

### Route Modules
- **`routes/llama.js`**: Llama API endpoints (`/api/llama`)
- **`routes/voice.js`**: Voice-related endpoints (`/api/voice/*`)
- **`routes/reviews.js`**: Review management endpoints (`/api/reviews`)
- **`routes/health.js`**: Health check endpoints (`/api/health`)

## 🚀 Usage

### Running the Modular Server
```bash
# Use the new modular server
node server-new.js

# Or update package.json to use the new server
npm run dev
```

### Benefits of Modular Structure

1. **Maintainability**: Each module has a single responsibility
2. **Readability**: Smaller files are easier to understand
3. **Testability**: Individual modules can be tested in isolation
4. **Scalability**: Easy to add new features without affecting existing code
5. **Reusability**: Modules can be reused across different parts of the application

### Migration from Monolithic Server

The original `server.js` file has been preserved for reference. To migrate:

1. **Backup**: Keep the original `server.js` as backup
2. **Test**: Verify all functionality works with the new modular structure
3. **Update**: Replace `server.js` with `server-new.js` when ready
4. **Cleanup**: Remove the old file after successful migration

## 🔄 API Endpoints

All API endpoints remain the same:

- `POST /api/llama` - Conversational AI responses
- `POST /api/voice/analyze` - Voice analysis
- `POST /api/voice/generate-review` - Review generation
- `POST /api/voice/suggest-location` - Location suggestions
- `POST /api/voice/customer-service-response` - Customer service responses
- `GET /api/reviews` - Fetch all reviews
- `GET /api/health` - Health check

## 🛠️ Development

### Adding New Features

1. **New Service**: Add to `services/` directory
2. **New Route**: Add to `routes/` directory
3. **New Utility**: Add to `utils/` directory
4. **New Config**: Add to `config/` directory

### Example: Adding a New API Endpoint

```javascript
// 1. Add service method in services/llamaService.js
async newFeature(input, apiKey) {
  // Implementation
}

// 2. Add route in routes/newFeature.js
router.post('/new-feature', async (req, res) => {
  // Route implementation
});

// 3. Mount route in server-new.js
app.use('/api', newFeatureRoutes);
```

## 📝 Notes

- All existing functionality has been preserved
- Error handling is consistent across modules
- The modular structure makes it easier to add new AI providers
- Response formatting is centralized in the utils module
- Database operations are abstracted in the config module

## 🔍 Troubleshooting

If you encounter issues:

1. **Check imports**: Ensure all modules are properly imported
2. **Verify paths**: Check that file paths are correct
3. **Test endpoints**: Use the health check endpoint to verify server status
4. **Check logs**: Review console output for error messages
5. **Fallback**: Use the original `server.js` if needed

The modular structure provides better organization while maintaining all existing functionality. 
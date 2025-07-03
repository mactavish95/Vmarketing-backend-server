# ReviewGen Backend Server

A secure, production-ready Express.js backend server for the ReviewGen app with NVIDIA Llama API integration.

## 🚀 Features

- **🤖 NVIDIA Llama Integration**: Full support for Llama 3.1 Nemotron Ultra API
- **🛡️ Security**: Helmet, CORS, rate limiting, input validation
- **📊 Monitoring**: Health checks, logging, error tracking
- **⚡ Performance**: Compression, optimized middleware
- **🔧 Production Ready**: Environment configuration, graceful shutdown

## 📋 Prerequisites

- Node.js 14.0.0 or higher
- NVIDIA API key from [https://integrate.api.nvidia.com](https://integrate.api.nvidia.com)
- npm or yarn package manager

## 🛠️ Installation

1. **Navigate to server directory**:
   ```bash
   cd server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   ```

4. **Edit `.env` file**:
   ```env
   NVIDIA_API_KEY=your_actual_nvidia_api_key_here
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

## 🚀 Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Manual Start
```bash
node server.js
```

## 📡 API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and uptime information.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

### NVIDIA Llama API
```
POST /api/llama
```

**Request Body:**
```json
{
  "text": "Your message here",
  "apiKey": "your_nvidia_api_key"
}
```

**Success Response:**
```json
{
  "success": true,
  "response": "AI generated response...",
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 200,
    "total_tokens": 250
  },
  "model": "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NVIDIA_API_KEY` | Your NVIDIA API key | - | ✅ |
| `PORT` | Server port | 3001 | ❌ |
| `NODE_ENV` | Environment mode | development | ❌ |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 | ❌ |

### Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Sanitized inputs
- **Error Handling**: Secure error responses

## 🛡️ Security

### Rate Limiting
- 100 requests per 15 minutes per IP address
- Configurable via environment variables
- Automatic retry-after headers

### Input Validation
- Text length limit: 4000 characters
- API key validation
- Input sanitization
- Type checking

### CORS Configuration
- Configurable origin
- Credentials support
- Preflight request handling

## 📊 Monitoring

### Health Check
Monitor server health at `/api/health`

### Logging
- Request logging with Morgan
- Error logging
- API usage tracking

### Error Tracking
- Structured error responses
- Error codes for client handling
- Development vs production error details

## 🔍 Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check `FRONTEND_URL` in `.env`
   - Ensure frontend is running on correct port

2. **API Key Issues**:
   - Verify NVIDIA API key is valid
   - Check key permissions and quota

3. **Port Conflicts**:
   - Change `PORT` in `.env`
   - Ensure port is not in use

4. **Rate Limiting**:
   - Check rate limit configuration
   - Monitor request frequency

### Debug Mode

Enable detailed logging:
```bash
NODE_ENV=development npm run dev
```

### Logs

Server logs include:
- Request details
- API responses
- Error information
- Performance metrics

## 🚀 Deployment

### Production Setup

1. **Set environment variables**:
   ```env
   NODE_ENV=production
   NVIDIA_API_KEY=your_production_key
   FRONTEND_URL=https://yourdomain.com
   ```

2. **Install production dependencies**:
   ```bash
   npm install --production
   ```

3. **Start server**:
   ```bash
   npm start
   ```

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment-Specific Configs

- **Development**: Detailed logging, CORS for localhost
- **Production**: Minimal logging, strict CORS, rate limiting
- **Testing**: Mock responses, no external API calls

## 📈 Performance

### Optimization Features

- **Compression**: Gzip compression for responses
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Early rejection of invalid requests
- **Error Handling**: Fast error responses

### Monitoring

Track these metrics:
- Request/response times
- Error rates
- API usage
- Server uptime

## 🔄 API Integration

### Frontend Integration

The React frontend is configured to work with this backend:

```javascript
// Example API call
const response = await fetch('http://localhost:3001/api/llama', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Your message',
    apiKey: 'your_api_key'
  })
});
```

### Error Handling

Handle different error codes:
- `INVALID_INPUT`: Check request body
- `INVALID_API_KEY`: Verify API key
- `QUOTA_EXCEEDED`: Wait and retry
- `RATE_LIMIT_EXCEEDED`: Reduce request frequency

## 📚 Additional Resources

- [NVIDIA API Documentation](https://docs.nvidia.com/api/)
- [Express.js Documentation](https://expressjs.com/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

---

**Note**: Always keep your NVIDIA API key secure and never commit it to version control. 
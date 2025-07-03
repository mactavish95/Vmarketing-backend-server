const OpenAI = require('openai');
require('dotenv').config();

async function testApiKey() {
  const apiKey = process.env.NVIDIA_API_KEY;
  
  console.log('🔑 Testing NVIDIA API Key...');
  console.log('Key length:', apiKey ? apiKey.length : 'Not found');
  console.log('Key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'N/A');
  
  if (!apiKey) {
    console.log('❌ No API key found in environment variables');
    return;
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  });

  try {
    console.log('🚀 Making test API call...');
    
    const completion = await openai.chat.completions.create({
      model: "nvidia/llama-3.3-nemotron-super-49b-v1",
      messages: [
        {
          role: "user",
          content: "Say 'Hello, API key is working!'"
        }
      ],
      temperature: 0.1,
      max_tokens: 50,
    });

    console.log('✅ API call successful!');
    console.log('Response:', completion.choices[0]?.message?.content);
    console.log('Usage:', completion.usage);
    
  } catch (error) {
    console.log('❌ API call failed:');
    console.log('Status:', error.status);
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    console.log('Type:', error.type);
    
    if (error.status === 401) {
      console.log('\n🔍 Troubleshooting 401 error:');
      console.log('1. Check if your API key is correct');
      console.log('2. Verify the key hasn\'t expired');
      console.log('3. Ensure you have access to Llama 3.1 Nemotron Ultra');
      console.log('4. Check your NVIDIA account permissions');
      console.log('5. Visit: https://integrate.api.nvidia.com to verify your key');
    }
  }
}

testApiKey(); 
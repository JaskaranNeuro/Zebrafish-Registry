const axios = require('axios');

async function testApi() {
  try {
    console.log('Testing API connection...');
    
    // Test with user endpoint
    const response = await axios.get('http://localhost:3000/api/user', {
      headers: {
        Authorization: 'Bearer ' + process.env.TEST_TOKEN || 'your-token-here'
      }
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testApi();
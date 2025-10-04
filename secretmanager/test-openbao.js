const axios = require('axios');

async function testOpenBao() {
  try {
    const baseUrl = 'http://localhost:8200';
    const token = 'root-token';
    
    console.log('Testing OpenBao connection...');
    
    // Test health check
    const healthResponse = await axios.get(`${baseUrl}/v1/sys/health`);
    console.log('✅ Health check:', healthResponse.status);
    
    // Test storing a secret
    const setSecretResponse = await axios.post(`${baseUrl}/v1/secret/data/test`, {
      data: { test: 'hello world' }
    }, {
      headers: {
        'X-Vault-Token': token,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Secret stored:', setSecretResponse.status);
    
    // Test retrieving the secret
    const getSecretResponse = await axios.get(`${baseUrl}/v1/secret/data/test`, {
      headers: {
        'X-Vault-Token': token
      }
    });
    console.log('✅ Secret retrieved:', getSecretResponse.data.data);
    
    // Test listing secrets
    const listResponse = await axios.get(`${baseUrl}/v1/secret/metadata?list=true`, {
      headers: {
        'X-Vault-Token': token
      }
    });
    console.log('✅ Secrets list:', listResponse.data.data?.keys || []);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testOpenBao();

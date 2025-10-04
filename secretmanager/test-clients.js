const axios = require('axios');

async function testClients() {
  try {
    console.log('🔐 Тестирование клиентов Keycloak...\n');
    
    // 1. Получаем токен администратора
    console.log('1️⃣ Получение токена администратора...');
    const adminTokenResponse = await axios.post('http://localhost:8080/realms/master/protocol/openid-connect/token', 
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: 'admin',
        password: 'admin'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const adminToken = adminTokenResponse.data.access_token;
    console.log('✅ Токен администратора получен');
    
    // 2. Получаем список клиентов
    console.log('\n2️⃣ Получение списка клиентов...');
    const clientsResponse = await axios.get('http://localhost:8080/admin/realms/master/clients', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const clients = clientsResponse.data;
    console.log('✅ Клиенты получены');
    
    const secretmanagerClients = clients.filter(c => 
      c.clientId === 'secretmanager-client' || c.clientId === 'secretmanager-admin'
    );
    
    console.log('\n📋 Найденные клиенты:');
    for (const client of secretmanagerClients) {
      console.log(`- ${client.clientId}: ${client.enabled ? '✅ Включен' : '❌ Отключен'}`);
      console.log(`  - Standard Flow: ${client.standardFlowEnabled ? '✅' : '❌'}`);
      console.log(`  - Direct Access Grants: ${client.directAccessGrantsEnabled ? '✅' : '❌'}`);
      console.log(`  - Public Client: ${client.publicClient ? '✅' : '❌'}`);
      console.log(`  - Redirect URIs: ${client.redirectUris?.join(', ') || 'Нет'}`);
      console.log(`  - Web Origins: ${client.webOrigins?.join(', ') || 'Нет'}`);
    }
    
    // 3. Тестируем получение токена для каждого клиента
    console.log('\n3️⃣ Тестирование получения токенов...');
    
    for (const client of secretmanagerClients) {
      console.log(`\n🔑 Тестирование клиента ${client.clientId}...`);
      try {
        const tokenResponse = await axios.post('http://localhost:8080/realms/master/protocol/openid-connect/token', 
          new URLSearchParams({
            grant_type: 'password',
            client_id: client.clientId,
            username: 'admin-user',
            password: 'admin123'
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        
        console.log(`✅ Токен для ${client.clientId} получен`);
        
        // Тестируем userinfo
        try {
          const userInfoResponse = await axios.get('http://localhost:8080/realms/master/protocol/openid-connect/userinfo', {
            headers: {
              'Authorization': `Bearer ${tokenResponse.data.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log(`✅ Userinfo для ${client.clientId} работает`);
        } catch (error) {
          console.log(`❌ Userinfo для ${client.clientId} не работает:`, error.response?.data || error.message);
        }
        
      } catch (error) {
        console.log(`❌ Ошибка получения токена для ${client.clientId}:`, error.response?.data || error.message);
      }
    }
    
    console.log('\n🎉 Тестирование клиентов завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

testClients();

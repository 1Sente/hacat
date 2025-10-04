const axios = require('axios');

async function testKeycloakDebug() {
  try {
    console.log('🔐 Отладочное тестирование Keycloak...\n');
    
    // 1. Проверяем доступность Keycloak
    console.log('1️⃣ Проверка доступности Keycloak...');
    const keycloakResponse = await axios.get('http://localhost:8080/');
    console.log('✅ Keycloak доступен');
    
    // 2. Получаем токен администратора
    console.log('\n2️⃣ Получение токена администратора...');
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
    
    // 3. Получаем список клиентов
    console.log('\n3️⃣ Получение списка клиентов...');
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
    
    // 4. Тестируем получение токена для каждого клиента
    console.log('\n4️⃣ Тестирование получения токенов...');
    
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
    
    console.log('\n🎉 Отладочное тестирование Keycloak завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

testKeycloakDebug();

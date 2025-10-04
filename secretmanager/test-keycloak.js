const axios = require('axios');

async function testKeycloak() {
  try {
    console.log('🔐 Тестирование Keycloak...\n');
    
    // 1. Проверяем доступность Keycloak
    console.log('1️⃣ Проверка доступности Keycloak...');
    const keycloakResponse = await axios.get('http://localhost:8080/');
    console.log('✅ Keycloak доступен');
    
    // 2. Получаем токен пользователя
    console.log('\n2️⃣ Получение токена пользователя...');
    const userTokenResponse = await axios.post('http://localhost:8080/realms/master/protocol/openid-connect/token', 
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'secretmanager-client',
        username: 'admin-user',
        password: 'admin123'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const userToken = userTokenResponse.data.access_token;
    console.log('✅ Токен пользователя получен');
    console.log('🔑 Токен:', userToken.substring(0, 50) + '...');
    
    // 3. Тестируем userinfo endpoint
    console.log('\n3️⃣ Тестирование userinfo endpoint...');
    try {
      const userInfoResponse = await axios.get('http://localhost:8080/realms/master/protocol/openid-connect/userinfo', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Userinfo endpoint работает');
      console.log('👤 Пользователь:', userInfoResponse.data.preferred_username);
    } catch (error) {
      console.log('❌ Ошибка userinfo endpoint:', error.response?.data || error.message);
    }
    
    // 4. Тестируем introspection endpoint
    console.log('\n4️⃣ Тестирование introspection endpoint...');
    try {
      const introspectionResponse = await axios.post('http://localhost:8080/realms/master/protocol/openid-connect/token/introspect', 
        new URLSearchParams({
          token: userToken,
          client_id: 'secretmanager-client'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      console.log('✅ Introspection endpoint работает');
      console.log('📊 Токен активен:', introspectionResponse.data.active);
    } catch (error) {
      console.log('❌ Ошибка introspection endpoint:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Тестирование Keycloak завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

testKeycloak();

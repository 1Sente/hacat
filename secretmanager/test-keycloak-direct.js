const axios = require('axios');

async function testKeycloakDirect() {
  try {
    console.log('🔐 Прямое тестирование Keycloak...\n');
    
    // 1. Получаем токен пользователя
    console.log('1️⃣ Получение токена пользователя...');
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
    
    // 2. Тестируем прямой запрос к Keycloak
    console.log('\n2️⃣ Тестирование прямого запроса к Keycloak...');
    try {
      const directResponse = await axios.get('http://localhost:8080/realms/master/protocol/openid-connect/userinfo', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Прямой запрос к Keycloak работает');
      console.log('👤 Пользователь:', directResponse.data.preferred_username);
    } catch (error) {
      console.log('❌ Прямой запрос к Keycloak не работает:', error.response?.data || error.message);
    }
    
    // 3. Тестируем запрос через backend
    console.log('\n3️⃣ Тестирование запроса через backend...');
    try {
      const backendResponse = await axios.get('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Запрос через backend работает');
      console.log('👤 Пользователь:', backendResponse.data.user.username);
    } catch (error) {
      console.log('❌ Запрос через backend не работает:', error.response?.data || error.message);
    }
    
    // 4. Тестируем introspection
    console.log('\n4️⃣ Тестирование introspection...');
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
      console.log('✅ Introspection работает');
      console.log('📊 Токен активен:', introspectionResponse.data.active);
    } catch (error) {
      console.log('❌ Introspection не работает:', error.response?.data || error.message);
    }
    
    console.log('\n🎉 Прямое тестирование Keycloak завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
  }
}

testKeycloakDirect();
